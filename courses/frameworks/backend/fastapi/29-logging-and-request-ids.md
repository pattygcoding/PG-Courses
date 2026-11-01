---
title: Logging and request ids
summary: One JSON line per record, a logger that carries the request id, and the fields that must never appear.
chapter: Testing and quality
minutes: 12
status: draft
---

## A formatter, because a sentence is not a field

```python
class JsonFormatter(logging.Formatter):
    """A formatter that writes one JSON object per record."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname.lower(),
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "logger": record.name,
            "message": record.getMessage(),
        }

        for key, value in record.__dict__.items():
            if key in EXTRA_FIELDS:
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload)
```

```python
EXTRA_FIELDS = {"request_id", "method", "path", "status", "duration_ms", "code"}
```

`EXTRA_FIELDS` is the allow list, and it is the reason the output is readable. `logging` attaches a dozen internal attributes
to every record, and dumping `record.__dict__` would put `args`, `msg`, `levelno` and a task name into the output. Naming the
six fields this application cares about is the difference between a log line and a debugging session.

```python
def configure_logging(level: str = "info") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())

    # uvicorn's own access log duplicates the one this application writes.
    logging.getLogger("uvicorn.access").disabled = True
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
```

Denying a logger in a library is a decision worth making explicitly. uvicorn's access log said the same thing in a different
shape; two lines per request is one line to read and one to skip.

## One line per request

```python
async def request_context(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    incoming = request.headers.get("x-request-id")
    request_id = incoming if incoming and len(incoming) <= 128 else str(uuid4())
    request.state.request_id = request_id

    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    response.headers["x-request-id"] = request_id

    logger.info(
        "request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
        },
    )

    return response
```

```text
{"level": "info", "time": "2026-10-31T15:35:21.245Z", "logger": "library_api.request", "message": "request",
"request_id": "ab8eb1e2-2f4b-4629-ae73-881344201f4e", "method": "GET", "path": "/books", "status": 200,
"duration_ms": 1.64}
```

Four decisions in that function. The id comes from the caller when there is one and is generated when there is not, and it goes
back on the response so a client can log the same value. The length check is the one piece of care: an incoming header is
attacker controlled, and a hundred-kilobyte id in every log line is a small denial of service against your log bill. The
timer is `perf_counter` rather than a wall clock, so a clock adjustment cannot produce a negative duration. And the log line is
written *after* the response, which is the only moment the status exists.

## Levels, and who reads them

The split this application makes is between 4xx and 5xx: a client mistake is a `warning` and a bug is an `error`. A 404 from a
scanner and a 404 from a real client are the same event and neither should wake anybody; a 500 belongs at a level an alert can
be built on. Logging every error at `error` is what makes a channel people mute.

## What must never be in a line

```python
logger.info("sign-in", extra={"password": password})           # never
logger.info("request", extra={"headers": dict(request.headers)})  # the authorization header is in there
```

The habit that prevents most of it is logging the fields you chose rather than the object you were given. A redaction list
helps, and it does not know that a field called `password` is one when it is nested under a key somebody invented a month
later.

## Check yourself

Send a request with an `x-request-id` and find the same id in the response and in the log line. Then log a dictionary
containing a password field, confirm it appears, and fix it by naming the fields instead of redacting the dictionary.
