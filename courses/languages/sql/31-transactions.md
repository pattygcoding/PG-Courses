---
title: Transactions
summary: All of it or none of it, the savepoint inside, and the commit that makes a load fast.
chapter: Modifying data
minutes: 13
status: draft
---

## A transaction is a group of statements that succeed together

```sql
begin;
update member set is_active = 0;

select count(*) as all_inactive from member;

rollback;

select count(*) as active_after_rollback from member where is_active = 1;
```

```text
all_inactive
------------
           4

active_after_rollback
---------------------
                    3
```

Inside the transaction every row was inactive, and after the `ROLLBACK` the table is as it was. The `COMMIT` that replaces
`ROLLBACK` makes the changes permanent, and until one of the two runs no other connection can see them.

That property is what makes a group of statements safe: a transfer is two updates, a loan is an insert and a decrement, and an
import is a thousand inserts. Half of it is a corrupt state, and the transaction is what makes half of it impossible.

## The engine already wraps single statements

```sql
insert into member(name, joined) values ('Ada', '2026-01-01'), ('Grace', '2026-01-02');
```

That statement is atomic on its own: if the second row violated a constraint, the first would not be stored. SQLite calls this
an implicit transaction per statement, PostgreSQL calls it autocommit, and both mean the same thing. A transaction you write is
needed only when **more than one statement** has to succeed together.

The cost is one commit per statement, and a commit is a flush to disk, which is why a loop of a thousand inserts with no
transaction takes seconds and the same loop inside one takes milliseconds. That is the biggest single performance decision in a
data load, and the next lesson uses it.

## Savepoints

```sql
begin;
savepoint first;
insert into member(name, joined) values ('Savepoint one', '2026-04-01');
savepoint second;
insert into member(name, joined) values ('Savepoint two', '2026-04-02');
rollback to second;

select name from member where name like 'Savepoint%';
```

```text
    name
-------------
Savepoint one
```

```sql
release second;
commit;

select name from member where name like 'Savepoint%';
```

```text
    name
-------------
Savepoint one
```

The first insert survived the rollback and the second did not, because `rollback to second` undid everything after the `second`
savepoint was taken. Savepoints nest and the outer transaction is still uncommitted until the `COMMIT`.

`release second` on its own would not undo anything: it forgets the savepoint and keeps its work. The pair, `rollback to` when
something failed and `release` when it did not, is the shape of a retry inside a larger unit of work:

```sql
begin;
insert into member(name, joined) values ('first', '2026-01-01');
savepoint attempt;
insert into member(name, joined) values ('second', '2026-01-02');
rollback to attempt;
insert into member(name, joined) values ('second try', '2026-01-03');
commit;
```

That is how a batch load keeps going after one bad row: the outer transaction holds the good rows and a savepoint around each
risky row lets it be discarded without losing the rest.

## What went wrong

A transaction can end for reasons other than a `COMMIT`:

- **A `ROLLBACK`**, which is the deliberate one.
- **An error**, which in PostgreSQL aborts the whole transaction: every later statement fails with "current transaction is
  aborted" until a `ROLLBACK`. That is why a program that catches an error must roll back before trying anything else.
- **A lost connection**, which the engine rolls back.
- **A deadlock or a serialisation failure**, where the engine picks one transaction to abort and the application retries. Those
  retries have to live above the transaction in the code, not inside it.

SQLite's behaviour on error differs in a way worth knowing: by default an error rolls back the failing statement and leaves the
transaction open. Two engines, two sensible policies, and the portable habit is to roll back explicitly on any error rather
than relying on either.

## Isolation is about what other connections see

A transaction's isolation level decides which of another transaction's uncommitted or recently committed changes it can see. The
standard names four levels and the interesting ones are:

- **Read committed**, PostgreSQL's default. A statement sees the rows committed before it started, so a query run twice inside
  one transaction can see a different result.
- **Repeatable read**, which fixes the snapshot for the whole transaction.
- **Serialisable**, which additionally makes the result equivalent to running the transactions one after another.

SQLite is different again: a write transaction takes a lock on the whole database, so two writers never run at once. That is why
SQLite needs no isolation setting and why it is the wrong engine for a hundred concurrent writers. Its concurrency is a file
lock rather than MVCC, and chapter eleven has the comparison.

## Locks are held until the end

A write lock inside a transaction is held until it commits, so a transaction that waits for user input holds it for as long as
the user takes. That is the shape of every "the application hung" incident: a transaction left open while a network call or a
form is completed. The rule I follow is that a transaction contains only database work, and anything slow happens outside it.

`BEGIN IMMEDIATE` in SQLite takes the write lock at the start rather than on the first write, which turns a possible "database
is locked" failure at a later statement into an immediate one. Where a transaction is expected to write, taking the lock up front
beats discovering the problem halfway through.

## Check yourself

Update every row in a table, count them, roll back, and count again. Take two savepoints with an insert after each, roll back to
the second and check what survived. Then insert a thousand rows in a loop and time it with and without a surrounding
transaction, and write down the difference between the two numbers.
