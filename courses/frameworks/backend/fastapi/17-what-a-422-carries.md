---
title: What a 422 carries
summary: Pydantic's error list, the location it reports, and the handler that translates it.
chapter: Errors
minutes: 12
status: draft
---

## The default answer

```bash
curl -s -X GET 'http://127.0.0.1:8000/books?per_page=1000'
```

```json
{"detail":[{"type":"less_than_equal","loc":["query","per_page"],
"msg":"Input should be less than or equal to 50","input":"1000","ctx":{"le":50}}]}
```

FastAPI answers a validation failure with a `422` and that shape, which is generated, complete, and not the shape the rest of
this API uses. One error contract means one contract, so the project replaces it with a handler:

```python
@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Pydantic reports a location as a list of segments, the first of which
    # names where the value came from: body, query, path or header.
    errors = [
        {"path": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
        for error in exc.errors()
    ]

    return problem_response(
        problem(422, "validation_failed", "The request is not valid.", request.url.path, errors)
    )
```

```json
{"type":"https://library.example.com/problems/validation-failed","title":"Unprocessable Entity",
"status":422,"detail":"The request is not valid.","code":"validation_failed","instance":"/books",
"errors":[{"path":"body.title","message":"String should have at least 1 character"},
{"path":"body.copies","message":"Input should be greater than or equal to 0"},
{"path":"body.id","message":"String should match pattern '^[a-z0-9-]{2,60}$'"}]}
```

Everything the generated version carried is still there: the same three failures, the same messages, the same order. What
changed is the envelope, and now there is one.

## The location is the interesting field

```text
["query", "per_page"]        a query parameter
["body", "title"]            a field in the JSON body
["path", "book_id"]          a path segment
["header", "authorization"]  a header
["body", "copies", 3]        the fourth item of a list in the body
```

`".".join(str(part) for part in error["loc"])` turns that into `body.copies.3`, which reads as an address in the request. A
client can point a form field at it without parsing anything, and a test can assert on it:

```python
paths = {error["path"] for error in body["errors"]}
assert {"body.id", "body.title", "body.copies"} <= paths
```

That test is why the fields appear in a stable order in the demonstration above, and the assertion uses a set because the
order pydantic reports in is an implementation detail rather than a promise.

## Why every failure at once

```text
body.title   String should have at least 1 character
body.copies  Input should be greater than or equal to 0
body.id      String should match pattern '^[a-z0-9-]{2,60}$'
```

A handler that checked one rule at a time would answer with the first problem, and a client would need three round trips to
learn what a form needs. Validating a model validates all of it, so the first response is also the complete one.

## The status, briefly

`422 Unprocessable Entity` is FastAPI's choice for a body that parses and does not validate, and it is a good one: `400` is
for a request that could not be read at all, and this one was read and understood. A malformed JSON body is a `400` with a
different code, and the difference is worth keeping:

| Situation | Status | Code |
| --- | --- | --- |
| the JSON does not parse | 400 | `bad_request` |
| a field breaks a rule | 422 | `validation_failed` |
| a query value is out of range | 422 | `validation_failed` |
| a body is larger than accepted | 413 | `payload_too_large` |

## Where validation belongs

| Layer | Checks | Why there |
| --- | --- | --- |
| the model | shape, presence, ranges, formats | the request boundary, once |
| the database | uniqueness, references, invariants | the last line, for every writer |
| the repository | rules that need other rows | only the data layer knows them |

A rule that needs another table does not fit a model, such as "no more loans than copies". That check lives in the
repository, inside a transaction. A model is for everything a single request can be judged on by itself, and the two are not
in competition.

## Check yourself

Send a body with one valid field and three invalid ones and count the errors in the response, then send a query parameter of
the wrong type and compare the two `path` values. Finally remove the validation handler and look at the response a client
would have to parse instead.
