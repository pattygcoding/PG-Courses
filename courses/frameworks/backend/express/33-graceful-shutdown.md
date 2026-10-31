---
title: Graceful shutdown
summary: A signal, a deadline, and the difference between a restart and a dropped request.
chapter: Shipping
minutes: 13
status: draft
---

## What a restart does to a request

A platform that deploys sends `SIGTERM` to the process, waits a few seconds, and then kills it. When nothing handles that
signal, the process stops wherever it happens to be: a request mid-query gets a connection reset, an open transaction is rolled
back by the database, and a client sees a failure that had nothing to do with its request.

Handling the signal turns that into a queue that finishes.

## One shutdown path

```ts
export type Closable = {
  close(callback: (error?: Error) => void): void;
  closeIdleConnections(): void;
};

export function createShutdown({ target, logger, onClosed, timeoutMs = 10_000 }: ShutdownOptions) {
  let shuttingDown = false;

  return (reason: string) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info({ reason }, "shutting down");

    const deadline = setTimeout(() => {
      logger.error({ timeoutMs }, "shutdown took too long, exiting hard");
      process.exit(1);
    }, timeoutMs);

    // The timer must not be the reason the process stays alive.
    deadline.unref();

    target.close((error) => {
      clearTimeout(deadline);

      if (error) {
        logger.error({ err: error }, "close failed");
        process.exit(1);
      }

      onClosed();
    });

    // Stop accepting new connections, and let the open ones finish.
    target.closeIdleConnections();
  };
}
```

```ts
const shutdown = createShutdown({
  target: server,
  logger,
  onClosed: () => {
    database.close();
    logger.info("stopped");
    process.exit(0);
  },
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

Five decisions in that function, and each one is a failure mode:

| Decision | The failure it prevents |
| --- | --- |
| the `shuttingDown` flag | two signals racing, closing twice |
| `server.close()` first | new requests arriving while old ones drain |
| `closeIdleConnections()` | keep-alive connections holding the process open |
| the deadline with `unref()` | a request that never ends keeping the process up |
| the database closed in the callback | a query running against a closed handle |

`closeIdleConnections()` is the one that surprises people. A keep-alive connection from a browser that finished its request is
idle but still open, and `server.close()` waits for every open connection, including that one. Without the call, a shutdown
waits for the client's idle timeout, which is usually minutes, and the deadline fires.

`deadline.unref()` is what makes the deadline behave. An unref'd timer does not keep the event loop alive, so the process exits
before ten seconds are up when everything closed cleanly, and the timer still fires if anything hangs.

## Why one function

The shutdown is a function of a closable target rather than a pair of signal handlers with logic inside them. That is what
makes it testable, and the test found a bug in the first version of it:


```ts
/**
 * A stand-in for the HTTP server. Its close callback runs on a later tick, the
 * way a real server's does, because a double that answers immediately would let
 * a test pass on an order that never happens.
 */
function fakeServer(options: { error?: Error } = {}) {
  const closeIdleConnections = vi.fn();
  const close = vi.fn((callback: (error?: Error) => void) => {
    setImmediate(() => callback(options.error));
  });

  return { target: { close, closeIdleConnections } as Closable, close, closeIdleConnections };
}
```

```ts
test("stops accepting connections, closes, then runs its cleanup", async () => {
  const order: string[] = [];

  createShutdown({ target, logger, onClosed: () => order.push("cleanup") })("SIGTERM");

  expect(order).toEqual(["close called", "stopped accepting"]);

  await settle();

  expect(order).toEqual(["close called", "stopped accepting", "close finished", "cleanup"]);
});
```

Three tests: the order, the idempotency, and that the database closes after the server stops. A signal cannot be delivered
programmatically on every platform, and calling the handler directly is the version that runs everywhere and asserts the same
thing.

## Health, liveness and readiness

```ts
router.get("/", (_request, response) => {
  response.json({ status: "ok", uptimeSeconds: Math.round((Date.now() - started) / 1000) });
});

router.get("/ready", (_request, response) => {
  try {
    database.prepare("select 1 as ok").get();

    response.json({ status: "ready", database: "ok" });
  } catch {
    response.status(503).json({ status: "not ready", database: "unavailable" });
  }
});
```

Two questions a platform asks, and the answers are different:

| Probe | Question | Failing it means |
| --- | --- | --- |
| liveness | is the process running | restart it |
| readiness | can it serve a request | stop sending traffic, leave it running |

Answering both with one route is the common mistake. A process that is alive and cannot reach its database needs traffic taken
away, not a restart loop that makes it worse.

The readiness route is also where a shutdown belongs, and this is the part that makes the sequence work end to end:

```text
SIGTERM arrives
  readiness starts answering 503
  the load balancer stops sending new requests
  the open ones finish, up to the deadline
  the database closes and the process exits
```

Returning 503 from readiness on the first signal is what lets a platform drain before it kills, and it needs the probe
interval to be shorter than the grace period. Both are numbers to read rather than assume.

## Keep-alive, and the proxy in front

```ts
server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;
```

Node's default keep-alive timeout is five seconds and many proxies hold connections for longer, which produces a race: the
proxy reuses a connection at the moment your server closes it, and the client sees a reset on a request nobody made twice.
Setting the server's timeout above the proxy's makes the proxy close first, which is the direction that fails visibly.

The two numbers belong together: `headersTimeout` slightly above `keepAliveTimeout`, so a socket is not closed while a
request's headers are still arriving.

## Check yourself

Send `SIGTERM` to a running server and watch the log lines in order, then make a request that takes five seconds, send the
signal one second in, and confirm the request completes. Then set the deadline to one second and send the same slow request,
which is the case where the process exits hard and the client gets a reset.
