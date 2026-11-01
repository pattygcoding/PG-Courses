---
title: Testing through the layers
summary: A repository test without HTTP, the fixture that had to depend on another, and determinism in fixtures.
chapter: Testing and quality
minutes: 12
status: draft
---

## A rule tested without a status code

```python
def test_the_last_copy_cannot_be_lent_twice(connection) -> None:
    """The check and the insert are one transaction, so the fourth call loses."""
    model = LoanCreate(book_id="dune", member="Grace Hopper", days=7)

    for _ in range(3):
        loan_repository.borrow(connection, model)

    with pytest.raises(ConflictError) as raised:
        loan_repository.borrow(connection, model)

    assert raised.value.detail == "No copies of Dune are on the shelf."
```

That is the repository called directly, with a connection to the same database, and no client involved. The rule it covers has
nothing to do with HTTP, and the test is a quarter of a second faster than the endpoint version.

`pytest.raises(ConflictError)` with the exception *type* rather than a message match is the version to prefer: the class is
what the error handler branches on, and a message is a string that a well-meaning edit can reword while the behaviour stays
correct.

The endpoint test above it asserts the `409`, and the two are not duplicates. One describes the contract a client sees, and
this one describes the rule, and the pair is what makes a change to either visible.

## The rollback, tested by counting

```python
def test_a_refused_borrow_leaves_no_row_behind(connection) -> None:
    before = connection.execute("select count(*) as total from loans").fetchone()["total"]

    with pytest.raises(ConflictError):
        loan_repository.borrow(
            connection,
            LoanCreate(book_id="the-left-hand-of-darkness", member="Grace Hopper", days=7),
        )

    after = connection.execute("select count(*) as total from loans").fetchone()["total"]
    assert after == before
```

A count before and after is a blunt assertion that catches the specific failure a transaction is there to prevent: a half
applied write. It reads the database the way an operator would, which is why it is convincing.

## The fixture that had to depend on another

```python
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

The version without `client` in the signature ran first in two tests and produced:

```text
sqlite3.OperationalError: no such table: loans
```

Nothing was wrong with the fixture; the schema had not been applied yet, because the lifespan only runs inside the
`with TestClient(...)` block. Making the fixture depend on the client is how a test says "after the application started",
which is a real ordering constraint in the design rather than a quirk of pytest.

That is worth generalising: **a fixture may depend on another for its side effect, not only for its value.** The `client`
argument is unused in the body, and it is the reason the fixture works.

## Determinism, and why the seed is designed

```python
SEED_BOOKS = [
    ("dune", "Dune", "Frank Herbert", "science-fiction", 3, 1965),
    ("a-brief-history-of-time", "A Brief History of Time", "Stephen Hawking", "non-fiction", 2, 1988),
    ("the-left-hand-of-darkness", "The Left Hand of Darkness", "Ursula K. Le Guin", "science-fiction", 1, 1969),
    ("the-poetic-edda", "The Poetic Edda", "Anonymous", "poetry", 4, 1270),
]
```

Four books chosen so a test can name a case: one with three copies, one with two, one with a single copy that is already out
on loan, and one in a genre of its own. A fixture is worth designing like that, because the tests then read as sentences
about the library rather than about rows.

The seed also runs per test *file* rather than per test, and the tests are written to be independent of order: the loan test
asserts a change rather than a constant, and the waiting list test uses a name with `time` in it so it cannot collide with
anything a previous run left. A suite that passes alone and fails as a whole is usually a fixture problem, and the fix is
almost never to make the tests order-dependent.

## Check yourself

Add a repository test for a rule you have not covered, such as updating a book that does not exist, and assert the return
value rather than an exception. Then remove `client` from the `connection` fixture's signature, run the suite twice, and write
down which tests fail and why the failure is intermittent.
