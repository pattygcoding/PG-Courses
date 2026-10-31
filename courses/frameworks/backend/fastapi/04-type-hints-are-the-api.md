---
title: Type hints are the API
summary: Path, query and body parameters, the constraints that go with them, and what a 422 actually contains.
chapter: Getting started
minutes: 15
status: draft
---

## Where a value comes from

```python
from typing import Annotated

from fastapi import FastAPI, Query

app = FastAPI()


@app.get("/books")
def list_books(
    q: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    genre: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> dict[str, object]:
    return {"q": q, "genre": genre, "page": page, "per_page": per_page}
```

The rules that decide where each value comes from are simple:

| Argument | Where FastAPI looks | Why |
| --- | --- | --- |
| named in the path | the URL path | `/books/{book_id}` |
| a pydantic model | the JSON body | models are bodies |
| a scalar with a default | the query string | that is what a query is |
| anything with no default | also the query string, and required | a missing one is a 422 |

`Annotated[str | None, Query(...)]` is the form to use. The first half is the type and the second is the metadata, so the
constraint travels with the type instead of being a decorator argument, and a function that takes four query parameters can
be read as a signature rather than as a puzzle.

## The constraints are the validation

```bash
curl -s -X GET 'http://127.0.0.1:8000/books?per_page=1000'
```

```text
{"detail":[{"type":"less_than_equal","loc":["query","per_page"],
"msg":"Input should be less than or equal to 50","input":"1000","ctx":{"le":50}}]}
```

That is pydantic's default answer, and it is worth reading once because the detail inside it is what this course later turns
into a problem document:

| Field | Meaning |
| --- | --- |
| `loc` | where the value came from, as path segments: `query`, `per_page` |
| `msg` | the sentence a person reads |
| `type` | a stable string a client can branch on |
| `input` | what was received |

`loc` starting with `body`, `query`, `path` or `header` is how a client knows which part of the request to fix, and it is the
piece this course keeps when it replaces the shape.

## A literal is an enum

```python
from typing import Literal

Genre = Literal["science-fiction", "non-fiction", "poetry"]


@app.get("/books/by-genre")
def by_genre(genre: Annotated[Genre, Query()]) -> dict[str, str]:
    return {"genre": genre}
```

```text
genre=poetry     ->  200
genre=romance    ->  422, "Input should be 'science-fiction', 'non-fiction' or 'poetry'"
```

One line, and a filter a client cannot get wrong. The same literal appears in the OpenAPI schema as an `enum`, so a generated
client has a type for it rather than a free string, which is the difference between a filter and a template for a bug.

## Conversion, and the two directions

```python
@app.get("/loans/{loan_id}")
def read_loan(loan_id: int) -> dict[str, int]:
    return {"id": loan_id}
```

```text
/loans/7        ->  {"id": 7}      an int, not the string "7"
/loans/seven    ->  422
```

A path segment arrives as text and the annotation converts it. Where the conversion is impossible the request is refused,
which is the behaviour to want: `int(loan_id)` inside the function is a line that raises a `ValueError` a handler has to
catch, and the annotation moves that decision to the edge where it belongs.

## A default that is not a rule

```python
def list_books(page: Annotated[int, Query(ge=1)] = 1) -> ...:
```

`= 1` makes the parameter optional. `ge=1` makes it valid. They are different jobs, and the failure of confusing them is a
route that accepts `?page=-5` and passes a negative offset to a query.

## Check yourself

Add a route with a path parameter, two query parameters and one constraint on each, then call it with a valid request, a
missing required value and a value outside the constraint. Compare the three `loc` lists, and then check the same route in
`/openapi.json` to see where the constraints ended up in the schema.
