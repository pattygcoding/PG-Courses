---
title: Error classes
summary: One base class, six subclasses, and a rule that the status is decided in one place.
chapter: Errors
minutes: 13
status: draft
---

## What a handler should be able to write

```python
@router.get("/{book_id}", response_model=BookRead, responses=NOT_FOUND)
def read_book(book_id: str, connection: ConnectionDep) -> dict[str, Any]:
    book = book_repository.get_book(connection, book_id)

    if book is None:
        raise NotFoundError("That book is not in the catalogue.")

    return book
```

One line for the failure, no status code, no response shape, and the happy path unchanged. The alternative spreads the same
decision across every handler, and a shape that drifts:

```python
if book is None:
    raise HTTPException(status_code=404, detail={"error": "not found"})
```

`HTTPException` works and it is what most examples use. The reason this project does not: the status, the code and the message
end up at the raise site, in every handler, and the day the error shape changes there are forty places to edit.

## The base class

```python
class AppError(Exception):
    """A failure with the status and the code a client should see."""

    def __init__(
        self,
        status_code: int,
        code: str,
        detail: str,
        errors: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.errors = errors
```

| Field | Used for |
| --- | --- |
| `status_code` | the HTTP status the client sees |
| `code` | a stable string a client can branch on |
| `detail` | the sentence a person reads |
| `errors` | structured extras, such as the field list from a schema |

Inheriting from `Exception` rather than from Starlette's `HTTPException` keeps the framework out of the data layer, so a
repository can raise one of these without knowing there is an HTTP server above it. The handler that catches them is the one
place that translates.

## The six that carry a status

```python
class NotFoundError(AppError):
    def __init__(self, detail: str = "That resource does not exist.") -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, "not_found", detail)


class ConflictError(AppError):
    def __init__(self, detail: str = "That change conflicts with the current state.") -> None:
        super().__init__(status.HTTP_409_CONFLICT, "conflict", detail)


class UnauthorizedError(AppError):
    def __init__(self, detail: str = "Sign in to continue.") -> None:
        super().__init__(status.HTTP_401_UNAUTHORIZED, "unauthorized", detail)


class ForbiddenError(AppError):
    def __init__(self, detail: str = "You do not have permission to do that.") -> None:
        super().__init__(status.HTTP_403_FORBIDDEN, "forbidden", detail)


class RateLimitError(AppError):
    def __init__(self, detail: str = "Too many requests...", retry_after: int = 60) -> None:
        super().__init__(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_requests", detail)
        self.retry_after = retry_after


class UnsupportedMediaTypeError(AppError):
    def __init__(self, detail: str = "Send a .jpg, .png or .webp file...") -> None:
        super().__init__(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type", detail)
```

Every constructor takes a message with a default, so a raise site can be specific or silent:

```python
raise NotFoundError()                                            # "That resource does not exist."
raise NotFoundError("That book is not in the catalogue.")         # the useful version
```

The default exists so a hurried handler still answers correctly, and the messages here are written for the client rather than
for the log, because they are what the response contains.

## Throwing from a repository

```python
if stock is None:
    raise NotFoundError("That book is not in the catalogue.")

if stock["available"] < 1:
    raise ConflictError(f"No copies of {stock['title']} are on the shelf.")
```

A data layer that raises HTTP-flavoured errors is a design decision worth naming. The argument for it: the reason a borrow
failed *is* the rule, the rule is a 404 or a 409 in every context, and translating it twice adds a layer that can only lose
information. The argument against: a repository should not know it is behind HTTP, and a job that called the same function
would have to catch an error whose name is about a status code.

Both are defensible. The rule that matters is that the choice is made once, because mixing them produces a handler that
catches some failures and forgets others.

## What no handler should do

```python
return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})   # no
logging.exception("failed")                                                         # no
response.status_code = error.status_code                                            # no
```

A handler that formats an error is a handler the next one copies, and the copy is where the shape drifts. The chain in this
application guarantees the error handlers see every failure, including the ones raised before a handler runs, which is the
next two lessons.

## Check yourself

Add an error class for `410 Gone` with its own code, raise it from one route, and confirm the response and the log without
touching the handlers. Then replace one `NotFoundError` with an `HTTPException` and compare the two responses, which is the
argument for the class in one experiment.
