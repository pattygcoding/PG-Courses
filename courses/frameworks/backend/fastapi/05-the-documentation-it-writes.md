---
title: The documentation it writes
summary: /docs, /openapi.json, and the four declarations that decide what a client sees.
chapter: Getting started
minutes: 12
status: draft
---

## Two routes you did not write

```bash
curl -s -o /dev/null -w '/docs %{http_code}\n' http://127.0.0.1:8000/docs
curl -s -o /dev/null -w '/openapi.json %{http_code}\n' http://127.0.0.1:8000/openapi.json
```

```text
/docs 200
/openapi.json 200
```

`/openapi.json` is a document describing every route, and `/docs` is a page that renders it with a form per endpoint, so a
route can be called from a browser without a client. Both are generated from the code, which means they are as accurate as
the type hints and no more.

## The declarations that change the document

```python
from fastapi import APIRouter

router = APIRouter(prefix="/books", tags=["books"])


@router.get(
    "",
    response_model=Page[BookRead],
    summary="Search the catalogue",
    responses={422: {"model": Problem, "description": "The request is not valid."}},
)
def list_books(...) -> dict[str, Any]: ...
```

| Declaration | Effect on the schema |
| --- | --- |
| `prefix` | every path in the router starts with it |
| `tags` | the group this route appears under in the page |
| `summary` | the one-line name of the route |
| `response_model` | the shape of the response body, and what is filtered from it |
| `responses` | extra statuses the client should know about |

That last one is the difference between generated documentation and a description somebody typed. FastAPI knows a route
returns `200` and can return `422`; it does not know about a `409` unless the route says so, and a client author reading only
the schema would not know to handle it:

```text
responses={
    409: {"model": Problem, "description": "Nothing on the shelf, or already returned."}
}
```

Pointing that at the `Problem` model is what puts the error shape in the schema, and the test in this project asserts it is
there:

```python
problem_model = schema["components"]["schemas"]["Problem"]
assert {"type", "title", "status", "detail", "code"} <= set(problem_model["properties"])
```

## Turning it off in production

```python
app = FastAPI(
    title="Northside Library API",
    version=VERSION,
    docs_url=None if resolved.is_production else "/docs",
    redoc_url=None,
)
```

```text
/docs in production: 404
/openapi.json in production: 200
```

Both of those are worth knowing together. Hiding the interface stops a browser from browsing the API, and it does not hide
the schema, which is still served. Where the schema itself is private, `openapi_url=None` is the setting, and the cost is that
no client can generate from it and the documentation has to live somewhere else.

There is a case for leaving both on. An API with no public documentation and a schema that only insiders can see is harder to
integrate than one where the schema is public and the data behind it is protected by a token, which is the arrangement this
application uses in development.

## Versioning the document

```python
VERSION = "0.1.0"
```

The `version` field in the schema is the API version, and it is the one place a client can read it without a call. Keeping it
in the code next to the routes rather than in a file somebody updates at release time is the version that does not drift.

## Check yourself

Open `/docs`, call one route from it, and then change a route's `summary` and reload. Then remove a `responses` entry that
describes a 409 and read that status in the schema before and after, and finally set `openapi_url=None` and find which two
routes disappear.
