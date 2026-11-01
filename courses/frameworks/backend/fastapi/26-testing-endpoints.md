---
title: Testing endpoints
summary: Status, headers and body, and the refusals that matter more than the happy path.
chapter: Testing and quality
minutes: 12
status: draft
---

## What a test asserts

```python
def test_list_returns_a_page_of_the_catalogue(client: TestClient) -> None:
    response = client.get("/books")

    assert response.status_code == 200
    body = response.json()
    assert body["meta"] == {"page": 1, "per_page": 20, "total": 4}
    assert len(body["data"]) == 4
```

Three assertions and each is a promise: the status, the envelope, and the size. A test that asserted the whole body would fail
every time a field is added, and a test that asserted only the status would pass on a response that renamed `data` to `items`.

Where the body's shape *is* the subject, the whole document is right:

```python
def test_an_unknown_book_is_a_404_problem(client: TestClient) -> None:
    response = client.get("/books/no-such-book")

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json() == {
        "type": "https://library.example.com/problems/not-found",
        "title": "Not Found",
        "status": 404,
        "detail": "That book is not in the catalogue.",
        "code": "not_found",
        "instance": "/books/no-such-book",
    }
```

Every field is asserted, so a change to the type URL or a dropped key fails here rather than in a client.

## The refusals

```python
def test_creating_without_a_token_is_a_401(client: TestClient) -> None:
    assert client.post("/books", json=NEW_BOOK).status_code == 401


def test_a_member_is_refused_and_a_librarian_is_not(client, member_headers, librarian_headers) -> None:
    refused = client.post("/books", json=NEW_BOOK, headers=member_headers)

    assert refused.status_code == 403
    assert refused.json()["detail"] == "This needs one of these roles: librarian."

    # A member can still read, which is what the two checks are separated for.
    assert client.get("/books", headers=member_headers).status_code == 200

    created = client.post("/books", json=NEW_BOOK, headers=librarian_headers)
    assert created.status_code == 201


def test_the_same_id_twice_is_a_conflict(client, librarian_headers) -> None:
    assert client.post("/books", json=NEW_BOOK, headers=librarian_headers).status_code == 201

    again = client.post("/books", json=NEW_BOOK, headers=librarian_headers)

    assert again.status_code == 409
    assert again.json()["code"] == "conflict"
```

The third test is the shape of a test that covers a rule: do the thing, do it again, assert what the second one says. The
second is the shape of one that covers a difference: the same request from two accounts, and the two answers compared.

The happy path is what you tried by hand while writing the endpoint. The refusals are what a refactor breaks, and they are the
tests to write first when the code is fresh.

## The body that breaks the rules

```python
def test_a_body_that_breaks_the_rules_reports_every_field(client, librarian_headers) -> None:
    response = client.post("/books", headers=librarian_headers, json={...invalid...})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_failed"
    assert body["title"] == "Unprocessable Entity"

    paths = {error["path"] for error in body["errors"]}
    assert {"body.id", "body.title", "body.copies"} <= paths
```

The set and the `<=` are deliberate: the fields pydantic reports have an order, and asserting the order would make the test
depend on an implementation detail. What matters is which fields are named, and that all three are.

## An endpoint that talks to the database

```python
def test_borrowing_takes_a_copy_off_the_shelf(client, librarian_headers) -> None:
    before = client.get("/books/dune").json()["available"]
    assert before == 3

    response = client.post(
        "/loans",
        headers=librarian_headers,
        json={"book_id": "dune", "member": "Grace Hopper", "days": 14},
    )

    assert response.status_code == 201
    assert client.get("/books/dune").json()["available"] == before - 1
```

Reading the value before the write and asserting the change is more work than asserting a constant, and it is the version that
tests the behaviour rather than the fixture. It also makes the test survive a seed change, which is the difference between a
suite that lasts and one that is rewritten every sprint.

## Check yourself

Write the five refusals for the waitlist endpoint, which has none: an unknown book, a name that is too short, a missing body,
a duplicate name and a request that needs a token. Then delete the check inside the handler for one of them and see which test
fails, which is the measure of whether a test is about behaviour or about the code.
