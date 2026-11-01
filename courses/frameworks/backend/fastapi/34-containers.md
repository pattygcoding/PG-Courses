---
title: Containers
summary: A multi-stage image, a non-root user, and the volumes a stateful service needs.
chapter: Shipping
minutes: 13
status: draft
---

## The image

```dockerfile
# syntax=docker/dockerfile:1

# The build stage has the compiler and the tests; the runtime image has neither.
FROM python:3.14-slim AS build
WORKDIR /app

COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

COPY src ./src
COPY tests ./tests
RUN python -m pytest -q

FROM python:3.14-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV LIBRARY_ENVIRONMENT=production
ENV LIBRARY_DATABASE_PATH=/data/library.db
ENV LIBRARY_UPLOAD_DIR=/data/uploads
ENV PORT=8000

# The database and the uploads live on a volume, so a new container keeps them.
RUN mkdir -p /data && useradd --create-home --uid 10001 library && chown -R library:library /data

COPY --from=build /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=build /app/src ./src

USER library
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "library_api.main:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8000"]
```

Five decisions, and each one is worth the line:

| Line | Why |
| --- | --- |
| two stages | pip's cache, the test suite and the wheels never reach the runtime image |
| the tests run in the build | a failing test fails the image, which is the earliest useful place |
| `PYTHONUNBUFFERED=1` | logs appear as they happen rather than sitting in a buffer |
| a non-root user | a container that is breached is a container that is not root |
| the exec form `CMD` | python is PID 1 and receives `SIGTERM` itself |

The last row is the one that breaks graceful shutdown invisibly. A shell-form `CMD` runs the command through `/bin/sh`, so
PID 1 is the shell, the signal goes to the shell, and uvicorn keeps running until the platform's kill timer runs out.

`PYTHONUNBUFFERED` is the small one that costs an afternoon. Python buffers stdout when it is not a terminal, so a container
whose logs appear only on shutdown is a container nobody can debug while it is failing.

## What is not copied

```text
.venv/            the environment of whoever built the image
__pycache__/      bytecode for the wrong interpreter, at worst
tests/            they ran in the build stage
data/             a volume, not an image layer
.env              secrets come from the platform
```

That list is the `.dockerignore`, and leaving `.venv` off it is the mistake that makes a build either enormous or subtly
wrong: the host's environment is copied over the one pip built.

## Running it

```bash
docker build -t library-api .
docker run -p 8000:8000 -v library-data:/data --env LIBRARY_SECRET_KEY="$(openssl rand -hex 32)" library-api
```

```text
INFO:     Started server process [1]
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
{"level": "info", "message": "starting", "environment": "production"}
```

The volume is what makes the database outlive the container. Without it, every deploy starts with an empty library, and the
seed is the only thing in it.

There is a limit to that, and it is the biggest structural consequence of choosing SQLite:

```text
one container    the volume is the database, and a restart keeps it
two containers   two volumes, two databases, and a load balancer choosing between them
```

The second row is where SQLite stops being the right answer. The change is smaller than it sounds, because the SQL is in one
layer: a `DATABASE_URL` in the settings, a pool in `db.py`, and `select ... for update` in the borrow transaction, which is the
version of that lock a client-server database needs.

## What the platform needs

| Setting | Value |
| --- | --- |
| port | whatever `PORT` is set to, which the process reads |
| stop signal | `SIGTERM` |
| grace period | longer than the application's shutdown timeout |
| health check | the readiness route |
| volume | mounted at `/data` |
| secrets | environment variables, never the image |

A secret in a Dockerfile is in the image and in every layer that followed it, and removing the line in a later commit does not
remove it from the registry.

## Check yourself

Build the image, run it with a volume, add a book, and restart the container to confirm the book is still there. Then change
`CMD` to the shell form, send a `SIGTERM` with `docker stop`, and watch the shutdown log never appear.
