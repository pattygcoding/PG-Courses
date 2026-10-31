---
title: Dependency injection
summary: Depends, the yield that cleans up, factories, and the bug that comes from caching settings.
chapter: Requests and responses
minutes: 15
status: draft
---

## Shared work as a parameter

```python
from collections.abc import Iterator

import sqlite3

from fastapi import Depends, Request
from typing import Annotated


def get_connection(request: Request) -> Iterator[sqlite3.Connection]:
    """One connection per request, closed when the response is finished."""
    connection = db.connect(request.app.state.database_path)

    try:
        yield connection
    finally:
        connection.close()


ConnectionDep = Annotated[sqlite3.Connection, Depends(get_connection)]
```

```python
@router.get("/{book_id}", response_model=BookRead)
def read_book(book_id: str, connection: ConnectionDep) -> dict[str, Any]:
    book = book_repository.get_book(connection, book_id)

    if book is None:
        raise NotFoundError("That book is not in the catalogue.")

    return book
```

Three things arrive with that one annotation. FastAPI calls `get_connection` before the handler and passes the result in. The
code after `yield` runs *after the response is finished*, which is where a resource belongs. And the handler has no `try` and
no `close`, so the resource cannot be leaked by a return in the middle.

Doing it by hand is the version that leaks:

```python
def read_book(book_id: str) -> dict[str, Any]:
    connection = db.connect(path)          # where does path come from?
    book = ...                             # an exception here leaks the connection
    connection.close()

    return book
```

## A dependency is a function, so it composes

```python
def get_account(request: Request, settings: SettingsDep) -> Account | None:
    """Who the request is, if anyone. Never refuses: a public route uses this too."""
    header = request.headers.get("authorization", "")

    if not header.lower().startswith("bearer "):
        return None

    claims = decode_token(header[7:].strip(), settings.secret_key)

    if claims is None:
        return None

    return Account(id=int(claims["sub"]), role=str(claims["role"]))


def require_account(account: Annotated[Account | None, Depends(get_account)]) -> Account:
    if account is None:
        raise UnauthorizedError()

    return account


AccountDep = Annotated[Account, Depends(require_account)]
```

`require_account` depends on `get_account`, which depends on the settings. FastAPI resolves the graph, and a route can take
either one: the catalogue takes the optional version and stays public, and the write routes take the required version.

Splitting "who is this" from "this route needs a signed-in account" is what keeps a public route and a protected one the same
code with a different signature. It is also what makes the 401 correct: `get_account` never refuses, so a route without a
token is a valid request until something asks for an account.

## A factory, for a rule with an argument

```python
def require_role(*roles: str) -> Callable[[Account], Account]:
    def check(account: AccountDep) -> Account:
        if account.role not in roles:
            raise ForbiddenError(f"This needs one of these roles: {', '.join(roles)}.")

        return account

    return check
```

```python
@router.post("", dependencies=[Depends(require_role("librarian"))])
def create_book(book: BookCreate, connection: ConnectionDep) -> dict[str, Any]: ...
```

A `dependencies=[...]` argument runs the check without passing its result to the handler, which is what a route wants when the
rule matters and the value does not. Where the handler needs the account, it takes `AccountDep` as a parameter instead.

The factory pattern is the one to remember: a function that takes the rule and returns a dependency. `require_role("librarian")`
and `rate_limit("sign-in")` in this project are the same shape.

## The cached settings bug

```python
@lru_cache
def get_settings() -> Settings:
    return Settings()
```

```python
SettingsDep = Annotated[Settings, Depends(get_settings)]     # the bug
```

```python
def get_app_settings(request: Request) -> Settings:
    """The settings this application was built with."""
    settings: Settings = request.app.state.settings

    return settings


SettingsDep = Annotated[Settings, Depends(get_app_settings)]
```

The first version looks harmless and is wrong in a way that hides. `get_settings()` is cached per process, so an application
built by `create_app(settings)` with a temporary database and a test secret answered every request from the *defaults*: the
environment was `development`, the secret was the development one, and the tests that decoded a token failed for a reason that
pointed at the token.

The tests found it in one run, which is the argument for building an application in a test rather than importing the module
level one. A dependency that reads from `request.app.state` is the version that respects the application it was given.

## What a dependency may do

| It may | Because |
| --- | --- |
| read the request | it takes `Request` |
| read the application | it takes `Request` and reads `app.state` |
| raise an error | the handlers format it like any other |
| yield, and clean up after | the code after the `yield` runs |
| take other dependencies | the graph is resolved for it |

| It should not | Because |
| --- | --- |
| hold state between requests | there is one instance, and many requests |
| open a connection per call inside a loop | the dependency is per request, not per use |
| be a class for the sake of it | a function is a dependency |

## Check yourself

Put a `print` after the `yield` in `get_connection` and watch when it runs relative to the log line for the request, then
make a handler raise an error and confirm the connection still closes. Finally add a dependency that takes another
dependency and check that both run once per request rather than once per use.
