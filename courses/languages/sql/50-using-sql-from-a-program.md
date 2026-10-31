---
title: Using SQL from a program
summary: The statement, the result shape, the loop, and the error every call can return.
chapter: Working with a database
minutes: 13
status: draft
---

## Four verbs

Almost everything a program does to a database fits in four shapes:

| Shape | Returns | Example |
| --- | --- | --- |
| execute | a count of affected rows | an `INSERT`, `UPDATE` or `DELETE` |
| query | rows and columns | a `SELECT` |
| query one | one row or nothing | a lookup by primary key |
| execute scalar | one value | `select count(*)`, or `insert ... returning id` |

The names differ per library and the shapes do not. The important half of this page is what each shape has to check: a row count, a
loop's error, a nil, and a value.

## The loop

```text
rows = query("select id, title from book where author_id = ?", authorID)
for rows.next():
    row = rows.scan()
    ...
if rows.error():
    return rows.error()
rows.close()
```

Every client library's loop has the same four lines and the same four omissions that break it: not checking the iteration error,
not closing the rows, scanning into the wrong number of destinations, and returning early without closing. In the Go course the
deferred `rows.Close()` is the one that catches people; in Java and .NET it is a try-with-resources or a `using`.

**A query in a loop is the other mistake**, and it is the one that makes a page slow:

```text
books = query("select id, title from book")
for book in books:
    author = query_one("select name from author where id = ?", book.author_id)   -- N+1
```

One query for the list and one per row is N+1 queries, and a list of 200 books is 201 round trips. The fix is a join in the first
query or an `IN` with the collected ids, and it is almost always both faster and shorter. It is the commonest performance problem in
database-backed applications and it is invisible in the database's own logs unless you are looking for it.

## A transaction belongs to one unit of work

```text
begin()
try:
    insert(...)
    update(...)
    commit()
catch:
    rollback()
    rethrow
```

Three rules from the transaction lesson that show up as bugs when they are missed:

- **The transaction contains only database work.** A network call inside it holds a lock for the call's duration.
- **A failed transaction must be rolled back before the connection is reused.** In PostgreSQL nothing works in an aborted
  transaction, and a connection returned to a pool in that state fails the next request with a confusing error.
- **The rollback belongs in the same scope as the begin**, in a deferred or finally block, so an early return cannot skip it.

A retry for a serialisation failure belongs above the transaction, which means the whole block is a function that can be called
again. A retry inside the transaction retries a statement in a transaction that is already aborted.

## The error every call can return

Every database call can fail, and the failures are of four kinds, which want four different responses:

| Failure | Response |
| --- | --- |
| a constraint violation | a validation error for the user |
| a deadlock or serialisation failure | retry the transaction |
| a connection failure | retry, or fail the request |
| a syntax or type error | a bug, so fail loudly |

The first requires knowing which constraint failed, which is why named constraints matter and why a library that surfaces the
SQLSTATE code is easier to work with than one that returns a message string. SQLite's `SQLITE_CONSTRAINT_UNIQUE` and PostgreSQL's
`23505` are the same information, and a program that branches on the message text breaks when the message changes.

The third needs a decision rather than a check: a connection failure mid-request means the transaction is gone, and the request
either fails or is retried from the start. Retrying from the middle is not an option.

## Connection pooling

A connection is expensive to establish and cheap to reuse, so a program keeps a pool. The settings worth knowing:

- **Maximum connections.** Greater than the database's own limit means requests queue inside the database rather than in your
  application, which is usually the wrong place.
- **Maximum idle.** A pool that keeps connections open holds server memory per connection, and a hundred idle connections is a
  hundred sessions on the server.
- **Lifetime.** A connection that outlives a server restart is a connection that fails on first use, so a maximum age is worth
  setting.

SQLite has none of this, because the connection is the library in the process and there is no server to hold sessions. What it has
instead is a file lock, which is why a pool of SQLite connections is a set of connections contending for one writer at a time.

## Reading and writing in one place

The pattern I keep coming back to as projects grow:

- **One place that opens connections** and configures them, including `pragma foreign_keys = on` for SQLite.
- **One place that holds the SQL**, whether a repository class or a file of queries, so a schema change has one file to grep.
- **One place that maps a row to a value**, so the column list is written once.
- **Queries that return data, taking parameters**, and no string assembly anywhere.

None of that is a framework. It is the four places that make a database-using program readable, and a program without them has SQL
scattered through its request handlers with a concatenated `WHERE` in half of them.

## Check yourself

Write a loop that reads rows and calls a second query inside it, then rewrite it as one query with a join and compare the number of
statements. Write a transaction that rolls back on a failure and returns the error, and confirm that a connection is not reusable
after a failure without the rollback. Finish by listing the four failure kinds and saying what your program does for each.
