---
title: async def or def
summary: Which of the two a route should be, what the threadpool does for a def route, and what blocks the loop.
chapter: Requests and responses
minutes: 14
status: draft
---

## Two spellings, two places to run

```python
@app.get("/health")
async def liveness(settings: SettingsDep) -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.get("/health/ready")
def readiness(request: Request) -> JSONResponse:
    connection = db.connect(request.app.state.database_path)
    connection.execute("select 1").fetchone()
    connection.close()
```

Both are valid, and the difference is where they run:

| Route | Runs on | Correct for |
| --- | --- | --- |
| `async def` | the event loop | `await`-ing I/O that is already asynchronous |
| `def` | a threadpool, off the loop | blocking calls: a database driver, a file, a CPU-bound calculation |

A `def` route is not a compromise. Starlette runs it in a thread from a pool, so the event loop stays free to accept other
requests while a query runs. That is why the readiness route above is `def`: `sqlite3` is blocking, and putting it on the loop
would stop every other request for the length of the query.

## The mistake that costs the most

```python
@app.get("/slow")
async def slow() -> dict[str, str]:
    time.sleep(0.5)          # blocks the event loop
    return {"slept": "0.5s"}
```

`time.sleep` blocks the thread it runs on, and for an `async def` route that thread is the one serving every other request.
One slow endpoint stops the whole process for half a second. The two fixes, in order of preference:

```python
await asyncio.sleep(0.5)     # the asynchronous version of the wait

def slow() -> dict[str, str]:
    time.sleep(0.5)          # blocking, but on a threadpool thread
    return {"slept": "0.5s"}
```

A blocking call inside `async def` is the bug to look for when a service is fast under one request and slow under ten. The
functions to suspect have no `await` next to them: `time.sleep`, `requests.get`, a synchronous database driver, a large
`json.loads`, a tight loop, `open()` without any library in front of it.

## What to measure rather than assume

An in-process test client does not reproduce this, because the pool and the loop are the same thread there. The measurement
that means something runs the real server:

```bash
python -m uvicorn library_api.main:app --app-dir src --port 8000
```

Then two requests at once, with the loop's stopwatch on:

```bash
curl -s http://127.0.0.1:8000/slow &
curl -s -o /dev/null -w 'fast request: %{time_total}s\n' http://127.0.0.1:8000/fast
wait
```

Run that against an `async def /slow` with `time.sleep` in it and the fast request waits for the slow one. Change the
handler to `def`, keeping the same `time.sleep`, and the fast request finishes in milliseconds while the slow one is still
running. That experiment is worth ten paragraphs, and it is the one to run on your own service before believing anything here.

## Which one this application is

```text
routes that only build a value   async def
routes that touch the database   def
the upload endpoint              async def, because reading an upload is awaited
```

The upload is the third case and the most interesting. `UploadFile.read()` is asynchronous, so the route that reads a file in
chunks is `async def` and every blocking write is small. Where the work inside an `async def` route is heavy, it belongs in a
thread or a worker process rather than on the loop.

One more rule follows from all of this: never mix them carelessly. An `async def` route that calls a blocking helper is the
same bug as an `async def` route that blocks, and it is harder to spot because the `await` a few lines up suggests somebody
thought about it.

## Check yourself

Write the same endpoint twice, once as `async def` with `time.sleep` and once as `def` with the same call, and run the
two-request experiment above against each. Write down both timings, then do it a third time with `await asyncio.sleep` in the
async version and say which of the three you would ship.
