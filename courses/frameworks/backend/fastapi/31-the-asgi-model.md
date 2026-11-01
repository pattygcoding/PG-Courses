---
title: The ASGI model
summary: An application object that outlives the connections, and the lifespan that follows from it.
chapter: Shipping
minutes: 12
status: draft
---

## One object, many connections

```python
app = FastAPI(...)
```

That object is created once and lives for the life of the process. Requests arrive as calls into it, and the server decides how
many run at the same time. Everything that has a lifetime longer than a request belongs to the application rather than to a
handler, which is what makes the lifespan a real place and not a convention:

```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    logger.info("starting", extra={"environment": settings.environment})

    connection = db.connect(settings.database_path)
    db.apply_schema(connection)

    if settings.environment != "production":
        db.seed(connection)

    connection.close()

    yield

    logger.info("stopped")
```

| Lifetime | Where |
| --- | --- |
| one request | a dependency, which is the next table down |
| the process | the lifespan, or `app.state` |
| one connection | the server's, and not your business |

The third row is the one to leave alone. Starlette gives a handler the request and not the connection, and code that reaches
for the socket is code that assumes a server implementation.

## What the application carries

```python
app.state.settings = resolved
app.state.database_path = resolved.database_path
app.state.rate_limit_windows = {}
```

`app.state` is a plain object for anything the application needs to carry, and this project puts three things there: the
settings it was built with, the database path derived from them, and the rate limiter's windows.

Both lessons about bugs in this course come back to that line. The settings dependency that read the cached `get_settings()`
instead of `app.state.settings` made a test application answer with defaults, and the rate limiter that kept its windows in a
module dictionary shared them between applications. Both were fixed by moving state onto the object that owns it.

## Two hooks you will see in older code

```python
@app.on_event("startup")
async def startup() -> None: ...


@app.on_event("shutdown")
async def shutdown() -> None: ...
```

`on_event` is deprecated in favour of the lifespan, and the reason is ordering: two event handlers have no defined order
relative to each other, while one context manager has the order its `yield` writes down. The pair is equivalent for one
handler each, and the lifespan is the version that can be tested by writing a `print` on either side of the `yield`.

## Dependencies are the other lifetime

```python
def get_connection(request: Request) -> Iterator[sqlite3.Connection]:
    connection = db.connect(request.app.state.database_path)

    try:
        yield connection
    finally:
        connection.close()
```

A `yield` dependency is created and destroyed inside one request, which is what a connection, a transaction or a temporary
file wants. The two mechanisms are the answer to two different questions: the lifespan is for something the whole process
shares, and a dependency is for something one request needs.

## Where the process config comes from

```bash
python -m uvicorn library_api.main:app --app-dir src --host 0.0.0.0 --port 8000
```

The module path is what uvicorn imports to find the object, and `--app-dir src` is what makes the package importable without
installing it. Where the same application is started by a test, the import is a plain one:

```python
from library_api.main import create_app

app = create_app(settings)
```

Two ways in, one factory. That is the reason `main.py` exports both the factory and the module level application: uvicorn
wants an object to import, and a test wants a function it can call with its own configuration.

## Check yourself

Add a `print` on either side of the `yield`, start the server, and make one request, so the two lines and the request log are
in one terminal. Then move the schema application into a request handler and explain what breaks when two requests arrive at
the same moment.
