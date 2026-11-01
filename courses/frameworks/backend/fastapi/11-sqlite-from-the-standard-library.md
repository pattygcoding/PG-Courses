---
title: SQLite from the standard library
summary: A real database with no dependency, the two pragmas that make it behave, and the transaction flag.
chapter: Data
minutes: 15
status: draft
---

## A database that ships with Python

```python
import sqlite3

connection = sqlite3.connect("data/library.db")
```

No install, no server, no native build. SQLite is a file with a full SQL engine in it, and `sqlite3` is in the standard
library, so the data layer of this application costs one import.

| | SQLite | PostgreSQL |
| --- | --- | --- |
| where the data is | a file next to the process | another machine |
| concurrent writers | one at a time | many |
| scaling out | one file, one writer | replicas and a connection pool |
| operations | a file to back up | a server to run |
| cost | nothing | a service |

For an API on one container, SQLite is a real answer rather than a toy. The lesson on deploying is where that stops being
true, and the answer there is a connection string change rather than a rewrite, because the SQL is in one layer.

## The four settings that matter

```python
def connect(path: str) -> sqlite3.Connection:
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(path, check_same_thread=False)
    connection.row_factory = sqlite3.Row

    # Autocommit, so a transaction is opened and closed where the code says so
    # rather than by the driver at the first write.
    connection.isolation_level = None
    connection.execute("pragma journal_mode = wal")
    connection.execute("pragma foreign_keys = on")

    return connection
```

Each line is a decision with a symptom attached.

**`check_same_thread=False`** is what lets a connection cross a thread boundary, and it is needed because a `def` route runs
in a threadpool thread rather than the one that opened the connection. Without it, the failure is
`SQLite objects created in a thread can only be used in that same thread`, which arrives on the second request rather than
the first.

**`row_factory = sqlite3.Row`** makes a query return something you can read by column name. The default is a plain tuple, so
`row[3]` is the only way in, and a column added to a `select` silently shifts every index after it.

**`isolation_level = None`** turns off the driver's implicit transaction handling. The default value is `""`, which makes
sqlite3 open a transaction at the first write and commit it when you say so, and that interferes with the explicit
`begin immediate` the transaction lesson needs. With autocommit on, the module does exactly what the SQL says.

**`pragma foreign_keys = on`** is the line that makes a schema full of `references` clauses do anything. SQLite has foreign
keys off by default, for compatibility with databases written before the feature existed, so a child row can point at a parent
that does not exist unless this is set. The test in this project is the one that proves it:

```python
def test_deleting_a_book_takes_its_loans_with_it(client, librarian_headers, connection) -> None:
    before = connection.execute("select count(*) as total from loans").fetchone()["total"]
    assert before == 1

    client.delete("/books/the-poetic-edda", headers=librarian_headers)

    after = connection.execute(
        "select count(*) as total from loans where book_id = ?", ("the-poetic-edda",)
    ).fetchone()["total"]
    assert after == 0
```

`journal_mode = wal` is the fifth line and the one that matters under load: a write-ahead log lets a reader keep reading while
a writer is writing, which is what makes one process serving many requests with one database usable at all.

## The schema

```sql
create table if not exists books (
  id text primary key,
  title text not null,
  author text not null,
  genre text not null,
  copies integer not null default 1 check (copies >= 0),
  year integer not null,
  created_at text not null
);

create table if not exists loans (
  id integer primary key autoincrement,
  book_id text not null references books(id) on delete cascade,
  member text not null,
  borrowed_on text not null,
  days integer not null check (days between 1 and 28),
  returned_on text
);

create index if not exists loans_book_id on loans(book_id) where returned_on is null;
```

Four decisions, each moving a rule into the place that can enforce it:

| Decision | What it prevents |
| --- | --- |
| `not null` and `check` | a row that could never be valid, whatever wrote it |
| `references` | a loan pointing at a book that does not exist |
| `on delete cascade` | orphan rows when a book is removed |
| a partial index | scanning every loan to count the ones that are out |

The partial index is the shape of the query that uses it: counting copies on the shelf only looks at loans whose
`returned_on` is null, so the index covers only those rows.

## Dates, booleans and money

SQLite has text, numbers, blobs and null. Nothing else, which means a date is a string and a boolean is `0` or `1`:

```python
loan["overdue"] = bool(loan["overdue"])
loan["borrowed_on"] = date.fromisoformat(loan["borrowed_on"])
```

Dates are stored as `yyyy-mm-dd` because that format sorts as text and compares as a date, which a locale format does
neither of. Money is the third case and the one to be careful with: there is no decimal type, so an amount is an integer of
the smallest unit or a string, and a float is where somebody's total is off by a penny.

## Check yourself

Open a database in a scratch script, insert a row that breaks a `check` constraint and read the error, then do the same with
`foreign_keys` on and off and write down the difference. Finally insert a date as `2026-31-12` and as `2026-12-31` and see
which one a `date(...)` function accepts.
