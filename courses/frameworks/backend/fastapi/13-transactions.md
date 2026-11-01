---
title: Transactions
summary: The last copy of a book, two requests at once, and the four lines that make one of them lose.
chapter: Data
minutes: 13
status: draft
---

## The check that is not enough

Read a borrow as two steps and the bug is visible: two requests for the last copy can both see `available: 1` before either
has inserted a loan, and both succeed. The library has lent a book it does not have.

```python
stock = connection.execute(
    "select copies - (select count(*) from loans where book_id = ? and returned_on is null) as available from books where id = ?",
    (book_id, book_id),
).fetchone()

if stock["available"] < 1:
    raise ConflictError("No copies are on the shelf.")

connection.execute("insert into loans (book_id, member, borrowed_on, days) values (?, ?, ?, ?)", ...)
```

This is not a Python problem and `await` does not fix it. Two database operations have to be one, and the tool for that is a
transaction.

## One transaction, four lines

```python
def borrow(connection: sqlite3.Connection, data: LoanCreate, *, today: date | None = None) -> dict[str, Any]:
    borrowed_on = (today or datetime.now(UTC).date()).isoformat()
    connection.execute("begin immediate")

    try:
        stock = connection.execute(
            """
            select books.copies - (
              select count(*) from loans
              where loans.book_id = books.id and loans.returned_on is null
            ) as available, books.title
            from books where books.id = ?
            """,
            (data.book_id,),
        ).fetchone()

        if stock is None:
            raise NotFoundError("That book is not in the catalogue.")

        if stock["available"] < 1:
            raise ConflictError(f"No copies of {stock['title']} are on the shelf.")

        cursor = connection.execute(
            "insert into loans (book_id, member, borrowed_on, days) values (?, ?, ?, ?)",
            (data.book_id, data.member, borrowed_on, data.days),
        )
        connection.execute("commit")
    except Exception:
        connection.execute("rollback")
        raise

    loan = get_loan(connection, int(cursor.lastrowid or 0))
    assert loan is not None

    return loan
```

The test that proves it borrows the three copies of one book and then asks for a fourth:

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

And the second test is the one about the rollback:

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

## Why begin immediate

```sql
begin            -- deferred, the default
begin immediate  -- takes the write lock now
```

A deferred transaction takes its lock at the first read, so two transactions can both read and one fails at the write with
`database is locked`. `immediate` takes the write lock at the `begin`, so the second borrow waits at that line rather than
halfway through its check, and the failure becomes a short wait rather than an error a client has to understand.

This is also why the driver's implicit transactions had to be turned off in the connection:

```python
connection.isolation_level = None
```

With the default value, sqlite3 opens its own transaction before a write and the explicit `begin immediate` lands in the
middle of one, which is an error rather than a stronger lock.

## Rollback is the point

```python
except Exception:
    connection.execute("rollback")
    raise
```

Without the rollback, the transaction stays open and holds the write lock until the connection closes, so every other writer
waits. The `except` is not defensive programming here, it is the line that releases the lock when a rule refuses the
operation. Rethrowing matters as much: the error is what becomes a 409, and swallowing it would answer 201 for a loan that
does not exist.

## Keep it short

A transaction holds a lock, and a lock is a queue everybody else is standing in. Anything slow inside it is slow for every
other writer, so a call to another service or an email send belongs after the commit. That ordering has a consequence worth
naming: work done after a commit can fail while the write has already happened. The answer is not a longer transaction, it is
making the later step retryable.

## Where a constraint beats a transaction

Where a rule can be expressed as a constraint, let the database enforce it:

```sql
create unique index if not exists one_account_per_email on users(email);
```

That holds for every writer, including the one somebody writes next year in a script, and it needs no transaction because the
insert fails on its own. The borrow rule is not expressible that way, because the count depends on the other rows, which is
exactly the class of rule a transaction is for.

## Check yourself

Remove the `begin immediate` and the `commit`, borrow every copy of a book with two concurrent requests, and see whether the
library lends more copies than it owns. Then put the transaction back, make the insert fail deliberately, and confirm the
failed attempt left no row behind.
