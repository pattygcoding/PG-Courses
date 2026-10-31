---
title: Transactions
summary: The last copy of a book, two requests at once, and the four lines that make one of them lose.
chapter: Data
minutes: 13
status: draft
---

## The check that is not enough

Read a borrow as two steps and the bug is visible: two requests for the last copy can both read `available: 1` before either
has inserted a loan, and both succeed. The library has lent a book it does not have, and the failure appears in a report
months later.

```ts
const stock = this.database
  .prepare("select books.copies - (select count(*) from loans where loans.book_id = books.id and loans.returned_on is null) as available from books where books.id = ?")
  .get(input.bookId);

if (stock.available < 1) {
  throw new ConflictError(`No copies of that book are on the shelf.`);
}

this.database.prepare("insert into loans (book_id, member, borrowed_on, days) values (?, ?, ?, ?)").run(/* ... */);
```

This is not a JavaScript problem and `await` does not fix it. It is two database operations that have to be one, and the tool
for that is a transaction.

## One transaction, four lines

```ts
borrow(input: NewLoan, today = new Date()): OutstandingLoan {
  this.database.exec("begin immediate");

  try {
    const stock = this.database
      .prepare(
        `select books.copies - (
           select count(*) from loans where loans.book_id = books.id and loans.returned_on is null
         ) as available, books.title
         from books where books.id = ?`,
      )
      .get(input.bookId) as { available: number; title: string } | undefined;

    if (!stock) {
      throw new NotFoundError("That book is not in the catalogue.");
    }

    if (stock.available < 1) {
      throw new ConflictError(`No copies of ${stock.title} are on the shelf.`);
    }

    const result = this.database
      .prepare("insert into loans (book_id, member, borrowed_on, days) values (?, ?, ?, ?)")
      .run(input.bookId, input.member, today.toISOString().slice(0, 10), input.days);

    this.database.exec("commit");

    return this.find(Number(result.lastInsertRowid)) as OutstandingLoan;
  } catch (error) {
    this.database.exec("rollback");

    throw error;
  }
}
```

```bash
curl -s -o /dev/null -w 'borrow 1: %{http_code}\n' -X POST http://localhost:3000/loans -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' --data @scratch/loan.json
curl -s -o /dev/null -w 'borrow 2: %{http_code}\n' -X POST http://localhost:3000/loans -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' --data @scratch/loan.json
curl -s -X POST http://localhost:3000/loans -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' --data @scratch/loan.json
```

```text
borrow 1: 201
borrow 2: 201
{"type":"https://library.example.com/problems/conflict","title":"Conflict","status":409,
"detail":"No copies of A New Book are on the shelf.","code":"conflict","instance":"/loans"}
```

Three borrows of a book with two copies: two succeed and the third is refused with the reason. The check and the insert are
one operation, so the second request cannot see a shelf the first is about to empty.

## Why begin immediate

```sql
begin            -- deferred, the default
begin immediate  -- takes the write lock now
```

A deferred transaction takes its lock at the first read, so two transactions can both read and one fails at the write with
`SQLITE_BUSY`. `immediate` takes the write lock at `begin`, so the second borrow waits at that line rather than halfway
through its check, and the failure becomes a short wait rather than an error a client has to understand.

## Rollback is the point

```ts
} catch (error) {
  this.database.exec("rollback");

  throw error;
}
```

Without the rollback, the transaction stays open and holds the write lock until the connection closes, so every other writer
waits. The `try`/`catch` is not defensive programming here, it is the line that releases the lock when a rule refuses the
operation. Rethrowing matters as much: the error is what the caller turns into a 409, and swallowing it would answer 201 for
a loan that does not exist.

## Keep it short

A transaction holds a lock, and a lock is a queue everybody else is standing in. Anything slow inside it is slow for every
other writer, so a call to an external API or an email send belongs after the commit, and the transaction covers the
statements that have to agree with each other.

That ordering has a consequence worth naming: work done after a commit can fail while the write has already happened. The
answer is not a longer transaction, it is making the later step retryable.

## The alternative

Where a rule can be a constraint, let the database enforce it:

```sql
create unique index one_account_per_email on users(email);
```

That holds for every writer, including the one somebody writes next year in a script, and it needs no transaction because the
insert fails on its own. A constraint is the better tool wherever the rule can be expressed as one.

## Check yourself

Remove the `begin immediate` and the `commit`, borrow every copy of a book with two parallel requests, and see whether the
library lends more copies than it owns. Then put the transaction back, make the insert fail deliberately by borrowing a book
that does not exist, and confirm that the failed attempt left no row behind.
