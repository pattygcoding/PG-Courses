---
title: Async errors
summary: What Express 5 changed about a rejected promise, and the wrapper older code still carries.
chapter: Errors and responses
minutes: 12
status: draft
---

## A handler that throws without a try

```ts
app.get("/explode", async () => {
  throw new Error("async handler threw");
});
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/explode
```

```text
500
```

The request failed with a 500 and the process stayed up. In Express 4 the same handler produced a request that hung until the
client gave up, and the error appeared later as an unhandled rejection in the process log. This is the change with the largest
effect on existing code:

| Version | An `async` handler that rejects |
| --- | --- |
| Express 4 | the request hangs, and the rejection is unhandled |
| Express 5 | the rejection is passed to the error handler |

Underneath, it is one line in the router: the return value of a handler is checked, and if it is a promise, a rejection is
forwarded to `next`. Nothing has to be wrapped, so nothing has to be remembered.

## The wrapper you will still see

Express 4 code is full of this, and the shape is worth recognising even in a version 5 project:

```ts
type AsyncHandler = (request: Request, response: Response, next: NextFunction) => Promise<void>;

function wrap(handler: AsyncHandler) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };
}

app.get("/books", wrap(async (request, response) => {
  response.json({ data: await books.list() });
}));
```

It is harmless in Express 5 and it is not wrong, it is a no-op. The reason to remove it when you find it: the wrapper exists
to explain a framework behaviour that no longer exists, and a reader who does not know that will keep copying it.

The other version from that era, which is a real bug rather than a no-op:

```ts
app.get("/books", async (request, response) => {
  try {
    response.json({ data: await books.list() });
  } catch (error) {
    console.log(error);      // the error is swallowed, and the request hangs
  }
});
```

## Where a try belongs

Catching everything to log it is what turns a 500 into a timeout. Three cases where `try`/`catch` earns its place:

```ts
try {
  await riskyThing();
} catch (error) {
  request.log.warn({ err: error }, "the supplier API refused us, using the cached copy");
  return cached;
} finally {
  releaseLock();
}
```

| Reason | What it does |
| --- | --- |
| recovery | answers with something else, so the request succeeds |
| translation | turns a library's error into an `AppError` with the right status |
| cleanup | a `finally` that releases something, then rethrows |

```ts
try {
  return JSON.parse(raw);
} catch {
  throw new BadRequestError("The stored payload is not valid JSON.", "stored_payload_invalid");
}
```

That is the translation case, and it is the one a data layer needs most often: a driver error that means "the row is gone"
becomes a `NotFoundError`, and everything above it keeps working with the API's error vocabulary.

What none of those cases is: `catch (error) { console.log(error) }` with no rethrow. If the handler cannot answer
differently, the error belongs to the middleware, which logs it with the request id and answers the client.

## The failures the framework cannot catch

```ts
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception");
  process.exit(1);
});
```

A rejected promise with no handler and a synchronous throw outside a request are not things Express can route. In a server
they are liveness events: the process logs and exits, the platform starts another one, and the log is the only thing that
explains it.

The asymmetry is deliberate. An unhandled rejection is logged and the process continues, because Node's default for it was
already to warn, and the request that caused it has already failed. An uncaught exception exits, because the process is in an
unknown state: a half-written response or a half-updated cache is worse than a restart.

## Timers and sockets

The third source of failures outside a request is a resource the process opened:

```ts
const deadline = setTimeout(() => {
  logger.error({ timeoutMs }, "shutdown took too long, exiting hard");
  process.exit(1);
}, timeoutMs);

deadline.unref();
```

`unref()` is what stops an outstanding timer from keeping the process alive on its own, which matters in the shutdown path
where the timer exists precisely to be the last resort. The lifecycle lesson takes that apart.

## Check yourself

Write a handler that rejects with a value that is not an `Error`, such as a string, and check the log line and the response.
Then catch an error in one handler, log it, and confirm that the request never completes, which is the failure this lesson is
about. Finally add the two process handlers and make a promise reject from outside any request to watch what the process does.
