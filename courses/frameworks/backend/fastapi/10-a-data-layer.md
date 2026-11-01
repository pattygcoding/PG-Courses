---
title: A data layer
summary: Why the SQL does not belong in the router, and the dictionaries that leave a repository.
chapter: Data
minutes: 13
status: draft
---

## The version that does not last

```python
@router.get("/{book_id}", response_model=BookRead)
def read_book(book_id: str, connection: ConnectionDep) -> dict[str, Any]:
    row = connection.execute(
        "select id, title, author, genre, copies, year from books where id = ?", (book_id,)
    ).fetchone()

    return dict(row)
```

That works for one endpoint, and it puts three things in a route: SQL, the shape of a database row, and the shape of the
response. The next endpoint copies the query with a filter, and the third copies it again to add the copy counts. Within a
week there are five statements that are nearly the same and no place where a book is defined.

## The queries get a name

```python
def list_books(
    connection: sqlite3.Connection,
    *,
    q: str | None,
    genre: str | None,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]: ...


def count_books(connection: sqlite3.Connection, *, q: str | None, genre: str | None) -> int: ...


def get_book(connection: sqlite3.Connection, book_id: str) -> dict[str, Any] | None: ...


def create_book(connection: sqlite3.Connection, data: BookCreate) -> dict[str, Any]: ...


def update_book(connection: sqlite3.Connection, book_id: str, data: BookUpdate) -> dict[str, Any] | None: ...


def delete_book(connection: sqlite3.Connection, book_id: str) -> bool: ...
```

Six functions in a module, each taking the connection as its first argument. A class with those methods would be the same
design with a `self` in front of each signature; the functions are the version this project uses because there is no state to
keep between them, and a module is the simplest thing that can hold them.

The router then knows none of them is SQL:

```python
@router.get("/{book_id}", response_model=BookRead, responses=NOT_FOUND)
def read_book(book_id: str, connection: ConnectionDep) -> dict[str, Any]:
    book = book_repository.get_book(connection, book_id)

    if book is None:
        raise NotFoundError("That book is not in the catalogue.")

    return book
```

The import is what names the boundary:

```python
from library_api.repositories import books as book_repository
```

A reader of the router sees a call into `book_repository` and knows where to look, and the route itself reads as the sentence
it is: find a book by id, answer 404 if there is none, otherwise return it.

## The one shape that leaves the module

```python
def _to_loan(row: sqlite3.Row) -> dict[str, Any]:
    loan = dict(row)

    # SQLite has no boolean type, so a comparison comes back as 0 or 1.
    loan["overdue"] = bool(loan["overdue"])
    loan["borrowed_on"] = date.fromisoformat(loan["borrowed_on"])
    loan["due_on"] = date.fromisoformat(loan["due_on"])

    if loan["returned_on"] is not None:
        loan["returned_on"] = date.fromisoformat(loan["returned_on"])

    return loan
```

Three decisions in one small function:

`sqlite3.Row` is a mapping, not an object with attributes. It behaves like a tuple with names and supports `row["title"]`,
which is why `dict(row)` is the usual first step and why a pydantic model with `from_attributes=True` does not take one
directly: `model_validate(row)` expects attributes and gets a mapping. Converting to a dictionary at the repository boundary
removes the question from every caller.

The conversion of `0` and `1` to a boolean happens once, here, rather than in a template or in a test. SQLite has no boolean
type, so a comparison in a `select` comes back as an integer, and the place to fix that is where the row is read.

The dates become `date` objects rather than staying strings. The model then declares `due_on: date`, the OpenAPI schema says
`format: date`, and the JSON that goes out is the ISO string the format asks for. Doing it here means the validation on the
way out is real rather than a string that happens to look like a date.

## Why dictionaries and not models

A repository returning `BookRead` would tie the data layer to the response shape, and the first route that needs a different
view of a book would either widen the model or bypass the repository. Returning dictionaries keeps the two independent:

```python
data = book_repository.list_books(connection, q=filters.q, genre=filters.genre, limit=page.limit, offset=page.offset)

return {"data": data, "meta": {"page": page.page, "per_page": page.per_page, "total": total}}
```

FastAPI validates that dictionary against `Page[BookRead]` on the way out, so the last line of defence is the response model
rather than the repository. A field the repository forgot shows up as a validation error in development and in a test, not as
a missing key in somebody's client.

The alternative design, models all the way down, is defensible and common. The rule that matters either way: **a
`sqlite3.Row` never leaves the repository**, so no handler has to know how the driver spells a column.

## Where the transaction lives

The one operation that cannot be expressed as a single statement, borrowing a copy of a book, lives in the repository too, and
the next lessons take it apart:

```python
def borrow(connection: sqlite3.Connection, data: LoanCreate, *, today: date | None = None) -> dict[str, Any]:
```

A repository method that takes a lock belongs next to the statements it locks, for the same reason every other query does:
the caller should not have to know that checking a shelf and writing a loan are one operation.

## Check yourself

Add a `by_genre` method that groups the catalogue by genre and returns counts, use it in a new route, and confirm that no SQL
appeared in the router. Then make a repository method return a `sqlite3.Row` instead of a dictionary and see what an
`response_model` does with it, which is the argument for the boundary in one experiment.
