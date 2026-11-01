---
title: Performance and the event loop
summary: One thread, the work that blocks it, and the measurement that decides what to change.
chapter: Testing and quality
minutes: 13
status: draft
---

## One thread, and a queue

An ASGI server runs your application on one event loop. Requests arrive, the loop hands each one to the code that is ready, and
anything asynchronous waits on a queue while the loop takes the next thing. The rule that follows is short: **any blocking work
in an `async def` route stops every other request**.

The `async def` lesson covered which route to write. This one is about knowing what the number is.

## The measurements worth taking

```bash
curl -s -o /dev/null -w 'books %{time_total}s\n' http://127.0.0.1:8000/books
curl -s -o /dev/null -w 'sign-in %{time_total}s\n' -X POST http://127.0.0.1:8000/auth/sign-in \
  -H 'content-type: application/json' --data @scratch/signin.json
```

```text
books 0.0025s
sign-in 0.0238s
```

Twenty-four milliseconds against two and a half, and the difference is the password hash doing its job. That is not a problem
to fix: it is scrypt's whole purpose, and `SCRYPT_N` is the dial.

What the numbers give you is a budget. The cost of a sign-in is known, the cost of a read is known, and any endpoint that is
much slower than both is a candidate for the list below.

## What blocks, and where it belongs

| Work | Where it belongs |
| --- | --- |
| a password hash | the async form, or a threadpool |
| resizing an image | a worker, or a queue |
| a report over ten thousand rows | a queue, with the result stored |
| JSON of a huge payload | a limit on the endpoint, and paging |
| a call to another service | `await`, with a timeout |

The pattern behind the table is that work which scales with the input belongs somewhere that can grow. FastAPI gives each `def`
route a threadpool thread, which is the answer for the first two rows; the third is a job and the fourth is a bound on the
request.

## The bound is the cheapest fix

```python
def pagination(
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> Pagination: ...
```

```text
/books?per_page=1000  ->  422
```

A ceiling on a list endpoint is a performance decision before it is a validation one. It bounds the query, the JSON encoding
and the response size at once, and it costs one argument.

The same reasoning applies to a request body limit, which in FastAPI is a server setting rather than a middleware:

```bash
python -m uvicorn library_api.main:app --app-dir src --limit-max-requests 10000
```

## Measuring a change rather than guessing

```text
p50 and p99 latency at a fixed concurrency
requests per second at the same concurrency
the log's duration_ms, grouped by path
```

The percentile matters more than the average. An endpoint with a 5 ms average and a 400 ms 99th percentile is an endpoint
where one user in a hundred has a bad time, and the average hides exactly that user. The `duration_ms` field in this
application's access line is what turns those numbers into a query rather than a test rig, which is the reason to add the
field before the day somebody asks why the API is slow.

One caution about in-process measurements: `TestClient` calls the application without a server, so it does not reproduce the
threadpool or the loop's behaviour under load. Anything in this lesson has to be measured against `uvicorn`, with two requests
in flight, which is the experiment the `async def` lesson sets up.

## Check yourself

Take the timing of every endpoint in the API with `curl -w '%{time_total}'`, and write down the three slowest. Then find the
one that is slow because of work rather than because of storage, and move it off the request path or bound it.
