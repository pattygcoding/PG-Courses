---
title: What FastAPI is
summary: Starlette for HTTP, pydantic for validation, uvicorn for the socket, and type hints tying the three together.
chapter: Getting started
minutes: 14
status: draft
---

## One endpoint, and everything it brings

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

```bash
python -m uvicorn library_api.main:app --app-dir src --port 8000
curl -s http://127.0.0.1:8000/health
```

```text
{"status":"ok"}
```

That is the whole framework on one screen, and the interesting part is what arrived with it. A request to `/docs` gives a
page that lists every route with a form to call it:

```bash
curl -s -o /dev/null -w '%{http_code} %{size_download} bytes' http://127.0.0.1:8000/docs
```

```text
200 1020 bytes
```

And `/openapi.json` is the schema that page is built from, generated from the same code:

```text
title: Northside Library API
paths: 13
/auth/me, /auth/sign-in, /auth/token, /books, /books/{book_id}, /books/{book_id}/loans,
/books/{book_id}/waitlist, /health, /health/ready, /loans, /loans/{loan_id},
/loans/{loan_id}/return, /uploads/covers
```

Thirteen routes, a schema, and a usable interface, from a decorator and a return type. Nothing in that output was written
twice.

## The three layers

| Layer | Package | Does |
| --- | --- | --- |
| the server | uvicorn | reads the socket, speaks HTTP, calls the application |
| the web framework | Starlette | routing, middleware, requests and responses |
| the validation | pydantic | checks values against types and converts them |

FastAPI sits on top and adds the parts that make the three feel like one thing: `Depends`, the OpenAPI generation, the
exception handlers, and the convention that type hints are the input.

Knowing which layer owns a behaviour is what makes an error message readable. A `404 Not Found` from an unmatched path comes
from Starlette; a `422` with a list of field errors comes from pydantic through FastAPI's handler; a `RuntimeError` in a
middleware traceback is Starlette's.

## Versions, and the two that matter

```text
fastapi            0.162.0
starlette          1.10.0
pydantic           2.14.2
uvicorn            0.54.0
```

| Version | Why it changes what you write |
| --- | --- |
| pydantic 2 | the validation core is compiled, and `model_dump` replaced `dict()` |
| Python 3.12 | the class type parameter syntax, which the generic models in this course use |
| Starlette 1 | the current TestClient is built on httpx, which is where a deprecation warning comes from later |

FastAPI's own version number moves in small steps by design: 0.162 rather than 1.0. The packages under it are what changed
most between the tutorials you will find and the code in front of you, which is why each of them gets named.

## What it does not include

| Decision | What FastAPI ships | What this course chooses |
| --- | --- | --- |
| the database | nothing | SQLite from the standard library |
| migrations | nothing | a schema applied at startup, with the honest note that it stops there |
| authentication | OAuth2 and JWT helpers | a bearer token verified by a dependency |
| an admin | nothing | not built |
| background work | `BackgroundTasks` | used once, for a log line |
| a front end | nothing | nothing; this is a JSON API |

None of those is a gap in the framework so much as a boundary. FastAPI is the web layer, and the rest is a library choice
like any other, which is why the tables above are part of the teaching rather than a footnote.

## What it is good at

- **A typed surface.** The validation, the schema and the editor hints are one source of truth.
- **Dependency injection that reads well.** Shared work is a function with a parameter, not a framework concept to learn.
- **`async` where it helps.** A route can be `def` and run in a threadpool, or `async def` and run on the loop.
- **A schema clients can use.** A generated OpenAPI document is a client library for another team.
- **Tests without a network.** `TestClient` calls the application in process.

## Check yourself

Start the application, then fetch `/openapi.json` and find the entry for `/books`. Write down which parts came from the type
hints and which from the decorator, and then remove the return annotation from one route and see what changes in the schema.
