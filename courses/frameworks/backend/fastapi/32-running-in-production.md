---
title: Running in production
summary: uvicorn, workers, the environment, and the two things that must not happen in a deploy.
chapter: Shipping
minutes: 13
status: draft
---

## The command

```bash
python -m uvicorn library_api.main:app --app-dir src --host 0.0.0.0 --port 8000 --workers 4
```

| Flag | Does |
| --- | --- |
| `library_api.main:app` | imports the module and takes the object named after the colon |
| `--app-dir src` | adds `src` to the path, so the package does not need installing |
| `--host 0.0.0.0` | binds every interface, which is what a container needs |
| `--workers 4` | forks four processes, each with its own loop |
| `--reload` | development only; it watches files and restarts |

`--reload` and `--workers` are mutually exclusive in spirit even where the flag combination is accepted. A reloader starts a
watcher per process and restarts them on a change, which is the opposite of what a deployed process should do.

## Workers, and how many

One worker means one event loop, and a synchronous dependency or a CPU-bound handler uses one thread of it at a time. Four
workers is four loops and four threadpools. The number to start from is the number of cores the container has, which on most
platforms is `2`, and the number to end with is whatever a load test says:

```text
one core, four workers   four processes competing for one core, and more context switching
many cores, one worker   the other cores idle
```

`uvicorn --workers` uses a process manager that restarts a worker that dies, which is the reason to prefer it to running four
containers with one worker each: the platform sees one process tree and one health check.

`gunicorn` with uvloop workers is the other common arrangement and it is what the older FastAPI documentation recommends. Both
work; `--workers` is the one that needs nothing installed on top.

## The environment is the configuration

```bash
LIBRARY_ENVIRONMENT=production \
LIBRARY_DATABASE_PATH=/data/library.db \
LIBRARY_SECRET_KEY="$(openssl rand -hex 32)" \
python -m uvicorn library_api.main:app --app-dir src --port 8000
```

The prefix is `LIBRARY_` because the settings model says so:

```python
model_config = SettingsConfigDict(env_file=".env", env_prefix="LIBRARY_", extra="ignore")
```

`extra="ignore"` is what stops a stray variable in the platform's environment from failing the model, and the validated
fields are what stop a *missing* one from starting the process. A bad value is a startup failure, which is a failed health
check rather than a broken request.

## Two things a deploy must not do

**Do not run a migration that changes a table at startup.** Every worker would race to run it, and a rollback would have to
undo a change made by whichever process started first. The schema application in this application's lifespan is safe because
`create table if not exists` only ever creates; the first `alter table` is where it moves to a deploy step.

**Do not seed in production.** The lifespan checks the environment for exactly that reason:

```python
if settings.environment != "production":
    db.seed(connection)
```

A seed that runs against a real database is a sample catalogue written over somebody's data, and it is one environment variable
away at all times.

## What to check after a deploy

```bash
curl -s http://127.0.0.1:8000/health/ready
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/books
```

```text
{"status":"ready","database":"ok","environment":"production"}
200
```

Readiness and one real endpoint. The first says the process can reach its database; the second says a request travels the whole
chain, including the dependencies and the model validation. A deploy that passes those two and nothing else has not proved
much, and it has ruled out the failures that account for most bad releases.

## Check yourself

Run the application with one worker and with four, send a request that blocks the loop, and compare what a second request sees
in each case. Then set `LIBRARY_ENVIRONMENT=production` locally and find the first thing that stops working without a
production secret.
