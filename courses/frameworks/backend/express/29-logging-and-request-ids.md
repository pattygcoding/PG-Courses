---
title: Logging and request ids
summary: One line per request, a logger that carries the id, and the fields that must never appear.
chapter: Testing and quality
minutes: 13
status: draft
---

## The line every request writes

```ts
function accessLog(logger: Logger) {
  return (request: Request, response: Response, next: NextFunction) => {
    const started = process.hrtime.bigint();

    response.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;

      logger.info(
        {
          requestId: request.id,
          method: request.method,
          path: request.originalUrl,
          status: response.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        },
        "request",
      );
    });

    next();
  };
}
```

```text
{"level":30,"time":"2026-10-31T15:35:21.245Z","requestId":"ab8eb1e2-2f4b-4629-ae73-881344201f4e",
"method":"GET","path":"/books","status":200,"durationMs":1.64,"msg":"request"}
```

Seven fields, and the line is JSON because a machine reads it first. An aggregator can filter on `status >= 500`, chart
`durationMs` per path, and group by `requestId` without a parsing rule per service.

Three details worth copying. `response.on("finish")` rather than logging before the handler, because the duration and the
status only exist once the response is sent. `process.hrtime.bigint()` rather than `Date.now()`, because it is monotonic, so a
clock adjustment cannot produce a negative duration. And `request.originalUrl` rather than `request.path`, because inside a
mounted router `path` is relative, so a line built from it says `/` for every request to `/books`.

## One id, from the client to the log

```ts
export function requestContext(logger: Logger) {
  return (request: Request, response: Response, next: NextFunction) => {
    const incoming = request.get("x-request-id");
    request.id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    request.log = logger.child({ requestId: request.id, method: request.method, path: request.path });

    response.setHeader("x-request-id", request.id);
    next();
  };
}
```

```text
x-request-id: trace-abc-123
```

The id is taken from the caller when there is one and generated when there is not, and it comes back on the response so a
client can log the same value. That is what turns a screenshot of an error into a query.

The length check is the one piece of care there. An incoming header is attacker-controlled, and a hundred-kilobyte id in
every log line is a small denial of service against your log bill.

`logger.child({...})` produces a logger that adds those fields to every line it writes, so a handler logs without repeating
them:

```ts
request.log.warn({ code: appError.code, status: appError.status }, "request refused");
```

```text
{"level":40,"time":"...","requestId":"ab8eb1e2-...","method":"POST","path":"/books","code":"unauthorized",
"status":401,"msg":"request refused"}
```

## Levels, and who reads them

| Level | Use |
| --- | --- |
| `fatal` | the process is about to exit |
| `error` | a request failed because of a bug or an outage |
| `warn` | a request was refused, or a fallback was used |
| `info` | the request line, and startup |
| `debug` | what somebody needs while investigating, off in production |

The split this application makes is between 4xx and 5xx:

```ts
if (appError.status >= 500) {
  request.log.error({ err: error, requestId: request.id }, "request failed");
} else {
  request.log.warn({ code: appError.code, status: appError.status, requestId: request.id }, "request refused");
}
```

A 404 from a scanner and a 404 from a real client are the same event, and neither should wake anybody. A 500 is a bug and
belongs at a level an alert can be built on. Logging every error at `error` is what makes an alert channel that people mute.

`LOG_LEVEL` comes from the environment, so production logs at `info` and a debugging session sets `debug` without a deploy.

## What must never be in a line

```text
a password, a token, an authorization header, a card number, a full body from a login route
```

Two ways to keep them out, and both are worth having:

```ts
const logger = pino({
  level,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
    censor: "[redacted]",
  },
});
```

And the habit of logging the fields you chose rather than the object you were given. A `logger.info({ body: request.body })`
in a sign-in handler writes a password to disk, and a redaction list does not know that a field called `password` is one when
it is nested under a key somebody invented.

## Where the logs go

```ts
export function createLogger(level: string): Logger {
  return pino({ level, base: undefined, timestamp: pino.stdTimeFunctions.isoTime });
}
```

Straight to stdout, which is what a container platform reads and forwards. `base: undefined` drops the pid and hostname pino
adds by default, because a platform attaches its own and a container's pid is always 1. The habit that breaks in production is
a transport writing coloured lines to a file, which puts the one output the platform collects behind a process that can fail.

## Check yourself

Send a request with an `x-request-id` and find the same id in the response and in the log line, then log an object containing
a password field and confirm it appears in the output. Add a redaction path for it, check again, and then set `LOG_LEVEL=debug`
for one run and count how many lines one request produces.
