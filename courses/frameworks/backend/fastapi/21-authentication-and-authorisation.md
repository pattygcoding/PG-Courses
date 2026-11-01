---
title: Authentication and authorisation
summary: Telling a request who it is, deciding what it may do, and the difference between 401 and 403.
chapter: Security and API concerns
minutes: 13
status: draft
---

## Two jobs, three dependencies

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
```

**Authentication** answers "who is this, if anyone". That dependency never refuses: a missing header, a malformed token and an
expired token all end in `None`. The catalogue is public, so a request with no token is a valid request.

```python
def require_account(account: Annotated[Account | None, Depends(get_account)]) -> Account:
    if account is None:
        raise UnauthorizedError()

    return account


def require_role(*roles: str) -> Callable[[Account], Account]:
    """A dependency factory: `Depends(require_role("librarian"))`."""

    def check(account: AccountDep) -> Account:
        if account.role not in roles:
            raise ForbiddenError(f"This needs one of these roles: {', '.join(roles)}.")

        return account

    return check
```

**Authorisation** answers "may this request do that", and it refuses. Keeping the two apart is what makes a public route and a
protected one the same code with a different signature:

```python
@router.get("", response_model=Page[BookRead])
def list_books(connection: ConnectionDep, filters: BookFiltersDep, page: PaginationDep): ...   # anyone

@router.post("", dependencies=[Depends(require_role("librarian"))])
def create_book(book: BookCreate, connection: ConnectionDep): ...                            # a librarian

@router.get("/me", response_model=UserRead)
def me(connection: ConnectionDep, account: AccountDep): ...                                   # signed in
```

## 401 against 403

```text
401 Unauthorized     no valid identity was presented, and presenting one would help
403 Forbidden        an identity was presented, and it is not allowed
```

```json
{"type":"https://library.example.com/problems/unauthorized","title":"Unauthorized","status":401,
"detail":"Sign in to continue.","code":"unauthorized","instance":"/books"}
```

```json
{"type":"https://library.example.com/problems/forbidden","title":"Forbidden","status":403,
"detail":"This needs one of these roles: librarian.","code":"forbidden","instance":"/books"}
```

Both responses name the rule. The 403 names the roles that would work, which is information a member is allowed to have and a
client can put in a message.

The test that pins it down is the one that would catch a rule attached to the wrong dependency:

```python
def test_creating_needs_a_librarian_not_an_account(client, member_headers) -> None:
    response = client.post("/books", json=NEW_BOOK, headers=member_headers)

    assert response.status_code == 403
```

A route that used `AccountDep` instead of `require_role("librarian")` requires a signed-in account and nothing more, so a
member could add books. That is the bug this project actually had, on the borrow route:

```python
def borrow_loan(loan: LoanCreate, connection: ConnectionDep, account: AccountDep) -> dict[str, Any]:
```

The signature reads as "a signed-in person", which is not the rule. The fix was one argument:

```python
@router.post("", dependencies=[Depends(require_role("librarian"))])
def borrow_loan(loan: LoanCreate, connection: ConnectionDep) -> dict[str, Any]:
```

The lesson is worth more than the fix. **Every route with a side effect names its rule in the decorator**, where a reader
cannot miss it, rather than taking a dependency that happens to require something.

## Where the check goes

The dependencies run before the handler, so a member who sends a malformed body is refused by the rule that matters rather
than being helped with their JSON. The role check is a `dependencies` entry rather than a parameter, which is how a rule that
has an answer but not a value is expressed: the handler never needs the account, only the guarantee that somebody checked.

A middleware that protected a list of paths would be the alternative, and it is the design where a new route is unprotected
because somebody forgot to add a line to a list. On the route, the check is impossible to miss while reading the file.

## Ownership, not only roles

```python
if loan["member"] != account.id and account.role != "librarian":
    raise ForbiddenError("That loan belongs to somebody else.")
```

A role answers what a kind of account may do. A resource that belongs to a person needs the second check, and it is the one
that gets forgotten, because the role check above it looks like it covers the case.

The shape that holds up better: the query that loads the row filters by the owner where the row is personal, and a miss is a
404 rather than a 403. A request for somebody else's loan then cannot tell the difference between "not yours" and "does not
exist", which is one less piece of information to leak.

## Check yourself

Add an endpoint only the owner of a loan may read, and try it as that person, as another member, and as a librarian. Write
down which status each gets and why. Then remove `require_role` from one write route, confirm an anonymous request can perform
it, and count how many tests fail.
