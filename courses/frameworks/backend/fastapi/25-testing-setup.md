---
title: Testing setup
summary: pytest, the TestClient, and a fixture per test file on a database of its own.
chapter: Testing and quality
minutes: 14
status: draft
---

## Two tools, one shape

```bash
pip install pytest httpx
```

`pytest` runs the tests, and `httpx` is what the `TestClient` is built on in the current Starlette, which is why it is a
dependency you install rather than one that arrives:

```text
StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
```

That warning appears once per run, and it is worth reading rather than suppressing: the client moved to a new HTTP library and
the old one still works during the transition. Where it becomes an error rather than a warning, the fix is the package it
names.
## The client

```python
from fastapi.testclient import TestClient

from library_api.main import create_app

client = TestClient(create_app(settings))

response = client.get("/books")

assert response.status_code == 200
```

`TestClient` calls the application *in process*: no port, no server, no network. A request travels the whole middleware chain
and every dependency, which is what makes the tests in this project worth having, and it means a test cannot pass because a
firewall or a port was in the way.

The cost of that is a caveat worth knowing before trusting a performance measurement, which the `async def` lesson met: an
in-process client does not reproduce the threadpool, so a timing taken through it says nothing about the real server.

## The application factory is what makes it testable

```python
def settings(tmp_path: Path) -> Settings:
    """A database of its own per test, which is a file rather than `:memory:`.

    Two connections to `:memory:` are two databases, and this application opens
    one per request, so the shared-nothing version of a test database is a file
    in a temporary directory.
    """
    return Settings(
        environment="test",
        database_path=str(tmp_path / "library.db"),
        secret_key="test-secret-key-that-is-long-enough-1234",
        rate_limit_per_minute=1000,
        upload_dir=tmp_path / "uploads",
    )
```

Four overrides, each one removing an obstacle:

| Override | Why |
| --- | --- |
| a temporary database path | no test touches the developer's own library |
| a test secret | a token a test signs can be decoded by the test |
| a rate limit of a thousand | sign-in tests do not trip the limit other tests are about |
| a temporary upload directory | an upload test cannot fill a folder |

The `:memory:` story is the interesting one. A connection to `:memory:` is a private database for that connection, and this
application opens one per request, so every request would see an empty library. A file in `tmp_path` is shared by every
connection in the test and thrown away at the end, which is the behaviour a test wants.

## The fixtures

```python
@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def connection(client: TestClient, settings: Settings) -> Iterator[sqlite3.Connection]:
    """A connection to the same database the application is using.

    It depends on `client` on purpose: the schema is applied by the application's
    lifespan, so a test that opens its own connection first would meet a database
    with no tables in it.
    """
    opened = db.connect(settings.database_path)

    try:
        yield opened
    finally:
        opened.close()
```

The `with` around the client is what runs the lifespan, which is what applies the schema. That is why the second fixture takes
`client` as an argument even though it does not use it: a test that asked only for `connection` would meet
`sqlite3.OperationalError: no such table: books`, and the fix is a dependency rather than a sleep.

Fixtures that hand back a token are the other half of the convenience:

```python
@pytest.fixture
def librarian_token(client: TestClient) -> str:
    response = client.post("/auth/sign-in", json=LIBRARIAN)
    assert response.status_code == 200

    return str(response.json()["access_token"])


@pytest.fixture
def librarian_headers(librarian_token: str) -> dict[str, str]:
    return {"authorization": f"Bearer {librarian_token}"}
```

A test that writes then reads as a librarian, and nothing else:

```python
def test_a_librarian_creates_a_book(client: TestClient, librarian_headers: dict[str, str]) -> None:
    response = client.post("/books", headers=librarian_headers, json=NEW_BOOK)

    assert response.status_code == 201
```

The `assert` inside the token fixture is deliberate. A test that failed because sign-in broke would otherwise fail with a
missing header and an unrelated message, and the assertion here says what actually went wrong.

## Running them

```bash
python -m pytest
```

```text
68 passed, 1 warning in 8.38s
```

`pytest -q` is the short version, and the `addopts = "-q"` in `pyproject.toml` makes it the default so the command in a
terminal and the command in CI are the same one.

## Check yourself

Add a fixture that returns a member's headers, then write a test that uses it to confirm a member cannot write. Then change
`database_path` to `":memory:"` and read the failure, which is the demonstration of what one connection per request means.
