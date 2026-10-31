---
title: Pydantic models
summary: One class per request and response shape, the model that hides fields, and the generic page envelope.
chapter: Requests and responses
minutes: 14
status: draft
---

## A model is the body's contract

```python
from pydantic import BaseModel, Field

Genre = Literal["science-fiction", "non-fiction", "poetry"]


class BookBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=120)
    genre: Genre
    copies: int = Field(ge=0, le=999)
    year: int = Field(ge=0, le=2100)


class BookCreate(BookBase):
    id: str = Field(pattern=r"^[a-z0-9-]{2,60}$")
```

A route that takes `book: BookCreate` validates the whole body at once, and answers with every problem rather than the first:

```json
{"type":"https://library.example.com/problems/validation-failed","title":"Unprocessable Entity",
 "status":422,"detail":"The request is not valid.","code":"validation_failed","instance":"/books",
 "errors":[{"path":"body.id","message":"String should match pattern '^[a-z0-9-]{2,60}$'"},
 {"path":"body.title","message":"String should have at least 1 character"},
 {"path":"body.copies","message":"Input should be greater than or equal to 0"}]}
```

Three fields, three messages, one round trip. That is the shape the error lesson formats, and the `path` values are pydantic's
`loc` with the segments joined.

## Inheritance, and a model for a partial update

```python
class BookRead(BookCreate):
    available: int
    waiting: int


class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    genre: Genre | None = None
    copies: int | None = Field(default=None, ge=0, le=999)
    year: int | None = Field(default=None, ge=0, le=2100)
```

`BookRead` adds the two fields the database computes, and it is the `response_model` of every route that returns a book, so
the two extra fields are published in the schema.

`BookUpdate` is separate rather than `BookCreate` with everything optional: a PATCH sends what changed, and the difference
between "absent" and "set to None" is real. That is what `exclude_unset` is for:

```python
changes = data.model_dump(exclude_unset=True)

if not changes:
    return current
```

`exclude_unset=True` gives only the fields the client sent, which is what turns a PATCH into a specific update rather than a
row overwrite. Without it, every omitted field would be written as its default.

## Validation does not run on the way out

```python
@app.get("/leaky")
def leaky() -> dict[str, str]:
    return {"title": "Dune", "internal_note": "do not publish"}
```

```text
{"title":"Dune","internal_note":"do not publish"}
```

A route with no `response_model` publishes whatever it returns, including a field that was meant to stay inside. Adding
`response_model=BookRead` changes that: the model is what a client receives, and anything the handler returns that the model
does not have is dropped before it goes out.

That is the reason to declare a response model on every route that returns data, and the reason the models for reading are
separate from the rows the database returns.

## One envelope for every list

```python
class PageMeta(BaseModel):
    page: int
    per_page: int
    total: int


class Page[ItemT](BaseModel):
    data: list[ItemT]
    meta: PageMeta
```

```python
@router.get("", response_model=Page[BookRead])
def list_books(...) -> dict[str, Any]:
    return {"data": data, "meta": {"page": page.page, "per_page": page.per_page, "total": total}}
```

`Page[ItemT]` is Python 3.12's class type parameter syntax, and pydantic 2 understands it, so `Page[BookRead]` is a model
whose items are books. The OpenAPI schema gets a component per instantiation, which is what a client generator needs:

```text
"Page_BookRead_": {"properties": {"data", "meta"}}
```

The payoff is a list endpoint that cannot forget the metadata, because the return annotation says it has to be there.

## Field names, and the boundary

The models in this application use snake_case, and so do the JSON bodies, which is the Python convention and the choice the
whole API makes consistently. Where a client needs another spelling, pydantic has an alias:

```python
class LoanCreate(BaseModel):
    book_id: str = Field(alias="bookId")
    model_config = ConfigDict(populate_by_name=True)
```

Doing that per field is a decision worth being deliberate about. A mixed API where some fields are camelCase and some are
not is harder to use than either convention on its own.

## Check yourself

Add a `published_on: date | None` field to a model, send a date in two formats and read both errors, then give one model an
alias and check which spelling appears in `/openapi.json`. Finally add a response model to a route that returns an extra
dictionary key and confirm the key disappears.
