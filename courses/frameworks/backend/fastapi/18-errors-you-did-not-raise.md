---
title: Errors you did not raise
summary: Starlette's HTTPException, the catch-all for the failure nobody planned, and the order the handlers run in.
chapter: Errors
minutes: 13
status: draft
---

## Three kinds of failure arrive

| Kind | Raised by | Example |
| --- | --- | --- |
| your classes | your code | `NotFoundError` |
| a validation failure | pydantic, through FastAPI | a body that breaks a rule |
| a Starlette exception | the framework | a path that matches no route |

Each needs a handler, and the project registers four:

```python
def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse: ...

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse: ...

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse: ...

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse: ...
```

## The framework's own

```python
@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = {
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
    }.get(exc.status_code, "http_error")

    return problem_response(problem(exc.status_code, code, str(exc.detail), request.url.path))
```

```bash
curl -s -X PUT http://127.0.0.1:8000/books/dune
```

```json
{"type":"https://library.example.com/problems/method-not-allowed","title":"Method Not Allowed",
"status":405,"code":"method_not_allowed","instance":"/books/dune"}
```

A `405` is Starlette's answer to a method a route does not implement, a `404` to a path that matches nothing, and both arrive
as the same exception class with a different status. Mapping the status to a code is what keeps them consistent with every
other error, and the fallback to `http_error` means an unplanned status still produces a valid document.

A `405` is worth noticing for one reason: Starlette raises it where Express answers `404` for a path it does not handle with
that method. Both are defensible, and this is what it looks like in the schema, because the framework is doing it for you.

## The one nobody planned

```python
@app.exception_handler(Exception)
async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    logging.getLogger("library_api.error").exception(
        "unhandled error",
        extra={"request_id": getattr(request.state, "request_id", None), "path": request.url.path},
    )

    return problem_response(problem(500, "internal_error", "Something went wrong.", request.url.path))
```

Without it, an unexpected exception is answered by Starlette's `ServerErrorMiddleware` with `Internal Server Error` as plain
text, which is a second error contract and a content type no client expects. The handler is the last piece that makes "every
error from this API has the same shape" true.

Two details in it are worth copying. The log line carries the request id, so the response a person screenshotted and the stack
trace are one query apart. And the message sent to the client is a constant: no `str(exc)`, no type name, nothing that
describes the inside of the service.

## Testing a 500 on purpose

A failure nobody plans is hard to produce, so the test produces one:

```python
def test_an_unexpected_failure_says_nothing_about_the_inside(
    settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    def explode(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("no such table: secret_table")

    monkeypatch.setattr(book_repository, "get_book", explode)

    app = create_app(settings)

    # raise_server_exceptions=False is what lets a test read a 500 rather than
    # having the exception re-raised into the test.
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/books/dune")

    assert response.status_code == 500
    assert response.json()["code"] == "internal_error"
    assert "secret_table" not in response.text
```

`monkeypatch.setattr` is what makes the failure real: a repository function that raises, in an application the test built, so
the request travels the whole chain from the raised error to the response. And `raise_server_exceptions=False` is the
TestClient option that turns the re-raise into a readable response, which is the only way to assert on a 500 at all.

## The order, and one gotcha

```text
a request
  fails validation            -> RequestValidationError handler
  raises an AppError          -> AppError handler
  raises an HTTPException     -> StarletteHTTPException handler
  raises anything else        -> Exception handler
```

Handlers are matched by class, and the most specific one that matches wins, so registering `Exception` does not shadow the
others. What it does not catch is an exception raised *while another handler runs*: a bug in the 404 handler is answered by
Starlette's plain-text 500, because the error path has already been entered once and there is nothing below it.

That is a small enough edge to accept, and worth knowing before spending an afternoon on it.

## Check yourself

Request a route with the wrong method, a path that does not exist, and a body that fails validation, and compare the three
documents. Then raise a plain `RuntimeError` from a route and confirm the catch-all answers, and finally put a `1 / 0` inside
the `NotFoundError` handler to see what happens when a handler itself fails.
