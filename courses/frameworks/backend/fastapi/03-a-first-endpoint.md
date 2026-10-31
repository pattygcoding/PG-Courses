---
title: A first endpoint
summary: A decorator, a function, and the return value that becomes the response body.
chapter: Getting started
minutes: 12
status: draft
---

## The route

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/books/{book_id}")
def read_book(book_id: str) -> dict[str, str]:
    return {"id": book_id}
```

```bash
curl -s http://127.0.0.1:8000/books/dune
```

```text
{"id":"dune"}
```

Three things are happening in five lines. `@app.get` registers the function for that method and that path. `book_id: str`
tells the framework the path has a segment to capture, and gives it the type to convert to. And the return value becomes the
body, `dict[str, str]` being the shape the schema will publish.

## Where the parameter comes from

The name in the braces and the name of the argument have to match, and the type is the rule for what the segment may be:

```python
@app.get("/books/{book_id}")
def read_book(book_id: str) -> dict[str, str]: ...     # any text


@app.get("/loans/{loan_id}")
def read_loan(loan_id: int) -> dict[str, int]: ...     # digits, or a 422
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/loans/seven
```

```text
422
```

A path parameter of the wrong type is a `422 Unprocessable Entity` with a body that says which value and why, produced
before the function runs. That is the whole idea of this framework in one example: the check is the annotation, and the error
is generated rather than written.

## Order matters, and it is the same trap as Express

```python
@app.get("/books/latest")
def latest() -> dict[str, str]: ...


@app.get("/books/{book_id}")
def read_book(book_id: str) -> dict[str, str]: ...
```

The literal route is registered first. Reverse them and a request for `/books/latest` is matched by `{book_id}` with the
value `"latest"`, and the specific handler never runs, because FastAPI tries routes in the order they were added.

## A handler that returns a value

```python
from fastapi import status


@app.post("/books", status_code=status.HTTP_201_CREATED)
def create_book(book: dict[str, str]) -> dict[str, str]:
    return book
```

```bash
curl -s -D - -o NUL -X POST http://127.0.0.1:8000/books \
  -H 'content-type: application/json' --data '{"id":"dune"}'
```

```text
HTTP/1.1 201 Created
content-length: 14
content-type: application/json
```

Four decisions are made by the declaration rather than by the body of the function: the method, the path, the status, and
the content type. A body argument of a plain `dict` is accepted and validated as JSON, which is the weakest version of the
idea; the next two lessons replace it with a model.

Returning a value and letting the framework serialise it is the convention to keep. Writing to a `Response` object directly
is possible and it means doing the content type, the status and the serialisation by hand, which is where an API drifts into
inconsistency.

## What arrived for free

```bash
curl -s http://127.0.0.1:8000/openapi.json | python -m json.tool | head -40
```

Every route above is in that document, with its parameters, its types and the responses it can return. The OpenAPI schema is
not an annotation you add later; it is generated from the same code that does the work, which is why it is accurate and why
it is worth checking after a change rather than writing a separate document.

## Read the response headers once

```bash
curl -s -D - -o NUL http://127.0.0.1:8000/health
```

```text
HTTP/1.1 200 OK
date: Sat, 31 Oct 2026 15:59:22 GMT
server: uvicorn
content-length: 61
content-type: application/json
```

Two of those become decisions later in this course. `server: uvicorn` names the stack to anybody probing the API, and
`content-type` is set for you by the framework, which is what a hand-written response has to be trusted to do correctly.
There is no `ETag` here, and the lesson on caching is about why that matters.

## Check yourself

Add a route with two path parameters and call it with one, then with a value of the wrong type, and read the two error
bodies. Then register a literal path and a parameterised one in both orders and explain which requests reach which handler.
