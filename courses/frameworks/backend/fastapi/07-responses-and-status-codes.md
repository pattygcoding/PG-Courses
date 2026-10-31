---
title: Responses and status codes
summary: The status on the decorator, the three ways to answer, and where a 204 must not have a body.
chapter: Requests and responses
minutes: 13
status: draft
---

## The status is a declaration

```python
@router.post(
    "",
    response_model=BookRead,
    status_code=status.HTTP_201_CREATED,
)
def create_book(book: BookCreate, connection: ConnectionDep) -> dict[str, Any]:
    ...
```

```bash
curl -s -D - -o NUL -X POST http://127.0.0.1:8000/books -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' --data @scratch/book.json
```

```text
HTTP/1.1 201 Created
content-length: 116
content-type: application/json
```

A `201` says a resource was created, and the body is the resource itself. The alternative, answering `200` for everything and
letting the body carry the meaning, is the API a client has to read carefully to use.

| Status | Route |
| --- | --- |
| `200` | a read, or a change that returns the result |
| `201` | a create |
| `204` | a delete, with no body |
| `400` and `422` | the request is wrong |
| `401`, `403`, `409`, `415`, `429` | refused for a reason a client can act on |
| `500` | nobody planned it |

## Three ways to answer

```python
@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: str, connection: ConnectionDep) -> None:
    if not book_repository.delete_book(connection, book_id):
        raise NotFoundError("That book is not in the catalogue.")
```

```python
@router.get("/ready")
def readiness(request: Request) -> JSONResponse:
    try:
        connection = db.connect(request.app.state.database_path)
        connection.execute("select 1").fetchone()
        connection.close()
    except Exception:
        return JSONResponse(status_code=503, content={"status": "not ready"})

    return JSONResponse(status_code=200, content={"status": "ready"})
```

| Style | When |
| --- | --- |
| return a value | the normal case, with a status on the decorator |
| return a `Response` | the status or the headers depend on what the handler found |
| raise an error | the request is refused, and the error handlers format it |

A `204` returns `None` and the framework sends no body. The response model is what would otherwise make the framework
serialise something, so a delete route declares no `response_model` and `-> None`, and the pair is a contract mypy can check.

Returning a `Response` directly is right for a health check, where the answer is a status code and a small body that no model
describes. It is the wrong tool for a resource, because it puts the content type and the serialisation in the handler.

## Headers, when the route sets them

```python
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_book(book: BookCreate, response: Response) -> dict[str, Any]:
    created = book_repository.create_book(connection, book)
    response.headers["location"] = f"/books/{created['id']}"

    return created
```

Injecting the `Response` object gives a handler somewhere to put a header without taking over the whole response. A `Location`
on a create is the standard's suggestion and it is optional: the body already contains the id, so a client that parses JSON
does not need it, and a client that follows links does.

## What a read returns

```bash
curl -s 'http://127.0.0.1:8000/books?q=edda&genre=poetry'
```

```json
{"data":[{"title":"The Poetic Edda","author":"Anonymous","genre":"poetry","copies":4,"year":1270,
"id":"the-poetic-edda","available":4,"waiting":0}],"meta":{"page":1,"per_page":20,"total":1}}
```

Three things worth reading in that output. The envelope is `data` and `meta`, the same for every list. `available` and
`waiting` are computed by the database rather than stored, which is why a book added a moment ago already reports them. And
the field order follows the model's declaration, which is cosmetic and worth leaving alone: a client that depends on field
order is a client that breaks.

## Errors are responses too

```python
if book_repository.get_book(connection, book.id) is not None:
    raise ConflictError(f"A book with the id {book.id} already exists.")
```

The handler raises and never touches a status code, and the error handler decides what the client sees. That is the split
that keeps the status decisions in one file, and the next two lessons are about the shape it produces.

## Check yourself

Write a route per row of the status table, then fetch each one with `curl -D -` and read the status line and the content
type. Then add a `Location` header to a create and confirm it with `-D -`, and finally make a delete route declare a response
model and see what the framework does with a `204`.
