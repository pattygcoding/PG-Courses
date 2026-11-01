---
title: The schema at startup
summary: The lifespan, where the schema and the seed belong, and the bug that came from skipping one of them.
chapter: Data
minutes: 12
status: draft
---

## The lifespan

```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup and shutdown, which is where the schema belongs rather than a route."""
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

The code before the `yield` runs once when the application starts, and the code after it runs when the application stops. On
the ASGI model a single application object outlives thousands of connections, so there is a real place for setup that a
request handler must not do.

The line worth reading twice is the one that is *not* there:

```python
# the version that broke
if settings.environment != "test":
    connection = db.connect(settings.database_path)
    db.apply_schema(connection)
    db.seed(connection)
    connection.close()
```

That is what this project had first, and the first test run answered with:

```text
sqlite3.OperationalError: no such table: books
```

The schema had been filed under "development setup" in my head, so the test environment skipped it, and the first query in the
first test met a database with nothing in it. The repair separates two things that look alike:

| Step | When it runs |
| --- | --- |
| `apply_schema` | always: it is what makes the first request work |
| `seed` | development and test only: a sample catalogue in production is somebody's real data |

`create table if not exists` makes the schema step safe to repeat, so every process can apply it at startup and the one that
finds the tables already there does nothing.

## What belongs in the lifespan

| Belongs | Does not belong |
| --- | --- |
| applying the schema | a migration on a database with data in it, which is a deploy step |
| seeding a development database | seeding production |
| opening a shared client, such as a pool | a per-request resource, which is a dependency |
| the startup and shutdown log lines | anything that needs a request |

The fourth row is the one that catches people out, and it is covered by the graceful-shutdown lesson: a lifespan shutdown is
where a pool is closed and where a background task is stopped, and it only runs if the process is stopped politely.

## Migrations, and where this stops

`create table if not exists` is enough for one application with no data to preserve, and it stops being enough the first time
a column has to change on a database that has rows in it. The statement above only ever creates.

| Stage | The tool |
| --- | --- |
| no data to preserve | the schema file, applied at startup |
| data to preserve, one developer | numbered SQL files and a table that records which ran |
| a team, and rollbacks to think about | Alembic, which generates the files from model changes |

The middle row is worth writing by hand once, because it makes the third row's value obvious. The shape is a folder of
`001_initial.sql`, `002_add_published_on.sql` and a `schema_migrations` table, and the rule that makes it safe is that a
migration only ever runs once per database, decided by a row rather than by the file's name.

## The application object, not the module

```python
def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    ...
    app = FastAPI(title="Northside Library API", version=VERSION, lifespan=lifespan, ...)
    app.state.settings = resolved
    app.state.database_path = resolved.database_path

    return app
```

The lifespan reads the database path from `app.state`, so an application built by a test with a temporary path creates its
schema *there*. That is the same principle as the settings dependency from the injection lesson: the application object
carries its configuration, and anything that reads it takes the object rather than a module level value.

## Check yourself

Move the schema application back inside the environment check, run the tests, and read the failure. Then add a `print` on
either side of the `yield` and start and stop the server, and confirm the order of the two lines relative to the request log.
