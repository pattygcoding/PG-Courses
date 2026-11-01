---
title: Problem documents
summary: One response shape for every error, borrowed from a standard, and the content type that goes with it.
chapter: Errors
minutes: 13
status: draft
---

## A shape decided once

```bash
curl -s http://127.0.0.1:8000/books/nope
```

```json
{"type":"https://library.example.com/problems/not-found","title":"Not Found","status":404,
"detail":"That book is not in the catalogue.","code":"not_found","instance":"/books/nope"}
```

That is RFC 9457, and a client that has seen one error from this API has seen them all:

| Field | Meaning |
| --- | --- |
| `type` | a URL that identifies the kind of problem |
| `title` | a short summary, the same for every instance of it |
| `status` | the HTTP status, repeated in the body for a client that logs only the body |
| `detail` | what happened this time, for a person |
| `instance` | the path it happened at |
| `code` | a machine-readable name, added because the type URL is long to compare |

## One function builds it

```python
def problem(
    status_code: int,
    code: str,
    detail: str,
    instance: str | None = None,
    errors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    document: dict[str, Any] = {
        "type": f"https://library.example.com/problems/{code.replace('_', '-')}",
        "title": TITLES.get(status_code, "Error"),
        "status": status_code,
        "detail": detail,
        "code": code,
    }

    if instance is not None:
        document["instance"] = instance

    if errors:
        document["errors"] = errors

    return document
```

The `TITLES` map is a small table of the statuses this API produces, and the fallback to `"Error"` means an unplanned status
still produces a valid document rather than `None`:

```python
TITLES: dict[int, str] = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    413: "Payload Too Large",
    415: "Unsupported Media Type",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
}
```

`errors` is the one field outside the standard, and it holds what a validation failure needs:

```json
"errors":[{"path":"body.title","message":"String should have at least 1 character"},
{"path":"body.copies","message":"Input should be greater than or equal to 0"}]
```

A person reads `detail`; a form fills its fields from `errors`. Both from one response.

## The content type is part of it

```python
PROBLEM_CONTENT_TYPE = "application/problem+json"


def problem_response(
    document: dict[str, Any], headers: dict[str, str] | None = None
) -> JSONResponse:
    return JSONResponse(
        content=document,
        status_code=document["status"],
        headers=headers,
        media_type=PROBLEM_CONTENT_TYPE,
    )
```

The first version of this function did not pass `media_type`, so every error went out as `application/json`. A client library
that has a problem-details type checks the content type, and it was checking the wrong string:

```text
content-type: application/problem+json
```

```python
def test_the_error_content_type_is_problem_json(client: TestClient) -> None:
    assert client.get("/books/nope").headers["content-type"] == "application/problem+json"
    assert (
        client.post("/books", json={"id": "x"}).headers["content-type"]
        == "application/problem+json"
    )
```

Two assertions, and the second is the one that matters: it covers the validation handler as well as the class handler, so a
new failure mode cannot quietly answer with the default content type.

## What a client is told about a 500

```json
{"type":"https://library.example.com/problems/internal-error","title":"Internal Server Error","status":500,
"detail":"Something went wrong.","code":"internal_error"}
```

Nothing about the failure: no stack trace, no table name, no path, no library version. The test asserts that with a string
search, because the leak is usually a `detail: str(exc)` that somebody added while debugging an incident:

```python
assert response.status_code == 500
assert response.json()["detail"] == "Something went wrong."
assert "secret_table" not in response.text
```

A validation message is the other side of that line. `"String should match pattern '^[a-z0-9-]{2,60}$'"` is written for a
client, because a client can fix it. `"no such table: secret_table"` is written for the server, because only the server can.

## Where the detail goes instead

```python
if appError.status_code >= 500:
    request.log.error({...}, "request failed")
else:
    request.log.warning({...}, "request refused")
```

The client gets a sentence and a request id; the log gets the stack, the request id and the route, and the two are joined by
that id when somebody sends a screenshot. Four hundreds are a client mistake and belong in the log quietly; five hundreds are
a bug and belong at a level an alert can be built on.

## Check yourself

Produce each status in the table with one request and compare the documents side by side, which is what a client author will
do first. Then raise an error containing a string that looks like a secret and check both the response and the log line for
it.
