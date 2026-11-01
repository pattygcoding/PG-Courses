---
title: Graceful shutdown
summary: The code after the yield, SIGTERM, and the difference between a restart and a dropped request.
chapter: Shipping
minutes: 12
status: draft
---

## What a restart does to a request

A platform that deploys sends `SIGTERM` to the process, waits a few seconds, and then kills it. When the process ignores the
signal, it is stopped wherever it happens to be: a request mid-query gets a connection reset, an open transaction is rolled
back by the database, and a client sees a failure that had nothing to do with its request.

Handling it is what the half of the lifespan after the `yield` is for:

```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # ... startup: the schema, the seed, a log line

    yield

    logger.info("stopped")
```

```text
{"level": "info", "message": "starting"}
{"level": "info", "message": "request", "status": 200}
{"level": "info", "message": "stopped"}
```

The last line appears when the process is asked to stop politely, and it is the cheapest proof that the shutdown path runs at
all. Start the server, make one request, press Ctrl+C, and watch the order.

## The sequence uvicorn follows

```text
SIGTERM arrives
  the server stops accepting new connections
  the open requests are given time to finish
  the lifespan's code after the yield runs
  the process exits
```

The middle two steps are the ones to check rather than assume. A request that takes longer than the platform's grace period is
cut off, and the number to compare is the platform's `stop_grace_period` against the slowest endpoint in the application.

| Setting | Where it lives |
| --- | --- |
| the grace period | the platform, for example `stop_grace_period: 30s` |
| the time an open request gets | uvicorn, `--timeout-graceful-shutdown 20` |

The code's number should be below the platform's, so the process exits on its own terms rather than being killed.

## What belongs after the yield

```python
yield

# close a pool
# stop a background task
# flush a buffer
logger.info("stopped")
```

This application has nothing to release, because its connections are per request and its rate limit windows live in memory
with the process. A service with a connection pool, a background worker or a metrics client has real work here, and the
ordering rule is the same one as everywhere else: stop taking new work, finish what is running, then release the resources
that work needs.

## Health, liveness and readiness

```python
@router.get("", response_model=HealthRead)
async def liveness(settings: SettingsDep) -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment, "version": VERSION}


@router.get("/ready")
def readiness(request: Request) -> JSONResponse:
    try:
        connection = db.connect(request.app.state.database_path)
        connection.execute("select 1").fetchone()
        connection.close()
    except Exception:
        return JSONResponse(status_code=503, content={"status": "not ready", "database": "unavailable"})

    return JSONResponse(status_code=200, content={"status": "ready", "database": "ok"})
```

| Probe | Question | Failing it means |
| --- | --- | --- |
| liveness | is the process running | restart it |
| readiness | can it serve a request | stop sending traffic, leave it running |

Answering both with one route is the common mistake. A process that is alive and cannot reach its database needs traffic taken
away, not a restart loop that makes it worse.

The readiness route opens its own connection rather than taking the request one, which is a fix this project made after a test
failed:

```python
app.state.database_path = str(tmp_path)     # a directory, which SQLite cannot open
response = client.get("/health/ready")

assert response.status_code == 503
```

With the dependency version, the connection failed *before* the route ran, so the health check answered `500` with a stack
trace: the one thing a health check must not do is fail in the same way as the thing it is checking. Opening the connection
inside a `try` is what lets it report the truth about itself.

## Check yourself

Send `SIGTERM` to a running server and watch the log lines in order, then make a slow request and send the signal one second
in to see whether it completes. Finally point the readiness route at a database path that does not work and confirm the `503`
rather than a `500`.
