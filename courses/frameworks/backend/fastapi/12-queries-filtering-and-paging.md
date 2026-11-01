---
title: Queries, filtering and paging
summary: One query assembled from parts, the parameters that keep it safe, and the second query that counts.
chapter: Data
minutes: 14
status: draft
---

## What the endpoint promises

```bash
curl -s 'http://127.0.0.1:8000/books?q=edda&genre=poetry'
```

```json
{"data":[{"title":"The Poetic Edda","author":"Anonymous","genre":"poetry","copies":4,"year":1270,
"id":"the-poetic-edda","available":4,"waiting":0}],"meta":{"page":1,"per_page":20,"total":1}}
```

A list endpoint has four jobs: filter, sort, page, and tell the client what the whole set was. The last one is the one that
gets left out, and without `meta.total` a client cannot render "page 1 of 3".

The filters themselves are declared as query parameters, so the schema and the validation come from the signature:

```python
def book_filters(
    q: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    genre: Annotated[Genre | None, Query()] = None,
) -> BookFilters:
    return BookFilters(q=q, genre=genre)


BookFiltersDep = Annotated[BookFilters, Depends(book_filters)]
```

`Annotated[str | None, Query(min_length=1, max_length=100)]` is the whole validation for that parameter, and because a page
size has a ceiling it is the difference between a list endpoint and a way to ask the server for the whole table:

```python
def pagination(
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> Pagination: ...
```

```text
/books?per_page=1000  ->  422, "Input should be less than or equal to 50"
```

## One query, built from parts

```python
def _filters(q: str | None, genre: str | None) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    parameters: list[Any] = []

    if q:
        clauses.append("(lower(title) like ? or lower(author) like ?)")
        needle = f"%{q.lower()}%"
        parameters.extend([needle, needle])

    if genre:
        clauses.append("genre = ?")
        parameters.append(genre)

    where = f"where {' and '.join(clauses)}" if clauses else ""

    return where, parameters
```

```python
def list_books(connection, *, q, genre, limit, offset) -> list[dict[str, Any]]:
    where, parameters = _filters(q, genre)
    rows = connection.execute(
        f"select {COLUMNS} from books {where} order by title limit ? offset ?",
        (*parameters, limit, offset),
    ).fetchall()

    return [dict(row) for row in rows]
```

The clauses are chosen by the code and the values travel separately, which is the safety argument for the two lists. A
combined version is shorter and it is an injection:

```python
# never
connection.execute(f"select * from books where title like '%{q}%'")
```

Passing parameters is also why a search term containing a quote is not a problem. `%` and `_` are SQLite's wildcards and a
term containing either matches more than a person expects, which is a small annoyance rather than a hole.

## The count is a second query

```python
def count_books(connection: sqlite3.Connection, *, q: str | None, genre: str | None) -> int:
    where, parameters = _filters(q, genre)
    row = connection.execute(f"select count(*) as total from books {where}", parameters).fetchone()

    return int(row["total"])
```

Two queries with the same `where` clause, one for the page and one for the total, and both built by the same helper, so they
cannot disagree about what is being counted. That is the bug where the list shows three rows and the total says five.

The `COLUMNS` constant is the third piece of the design:

```python
COLUMNS = """
  books.id,
  books.title,
  books.author,
  books.genre,
  books.copies,
  books.year,
  books.copies - (
    select count(*) from loans where loans.book_id = books.id and loans.returned_on is null
  ) as available,
  (select count(*) from waitlist where waitlist.book_id = books.id) as waiting
"""
```

The availability of a title is computed from the loans rather than stored on the book, so the copy counts cannot drift, and
every query that returns a book returns the same two computed fields because they are in one constant.

## Offsets have a cost

```sql
limit ? offset ?
```

`offset 10000` reads and discards ten thousand rows, and a page number a client chooses is a page number that grows. Where
that matters, the alternative is a keyset page: ask for the rows after a value the client already has.

```sql
select * from books where title > ? order by title limit ?
```

It removes the discard cost and it removes `meta.total`, because a cursor has no page number to be on. The trade is real in
both directions: an offset is the right default until a table is large enough to notice, and a cursor is the answer for a feed
that only ever scrolls forward.

## Check yourself

Add a `sort` parameter with three allowed values and a fallback, then send `?sort=title;drop table books` and confirm the table
survives. Then page to the end of the catalogue, check that `meta.total` stays constant, and compare the query plan of an
`offset 0` page with an `offset 100` one using `explain query plan`.
