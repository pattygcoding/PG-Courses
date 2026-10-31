---
title: SQLite with node:sqlite
summary: A real database with no dependency, and the pragmas and constraints that make it behave.
chapter: Data
minutes: 15
status: draft
---

## A database that ships with Node

```ts
import { DatabaseSync } from "node:sqlite";

const database = new DatabaseSync("data/library.db");

database.exec("pragma journal_mode = wal");
database.exec("pragma foreign_keys = on");
```

No install, no native build, no flag on Node 24. SQLite is a file with a full SQL engine in it, and `node:sqlite` is the
binding that Node now ships, so the data layer of this application costs one import.

The trade against a client-server database is the reason it fits here and not everywhere:

| | SQLite | PostgreSQL |
| --- | --- | --- |
| where the data is | a file next to the process | another machine |
| concurrent writers | one at a time | many |
| horizontal scaling | one file, one writer | replicas and connection pools |
| operations | a file to back up | a server to run |
| cost | zero | a service |

For an API on one container, SQLite is a real answer. The lesson on deploying is where that stops being true, and the answer
there is changing the connection string rather than the queries.

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

Four decisions in that block, and each one moves a rule into the place that can enforce it:

| Decision | What it prevents |
| --- | --- |
| `not null` and `check` constraints | a row that could never be valid, whatever wrote it |
| `references books(id)` | a loan pointing at a book that does not exist |
| `on delete cascade` | orphan rows when a book is removed |
| a partial index | scanning every loan to count the outstanding ones |

The foreign key is only enforced because of the pragma at the top of the file. SQLite has the feature off by default, for
compatibility with databases written before it existed, so a schema full of `references` clauses silently does nothing
without that one line.

The partial index is the other one worth noticing. The query that counts copies on the shelf only looks at loans whose
`returned_on` is null, so the index covers only those rows: smaller than a full index, and exactly the shape of the query.

## Prepared statements, and binding

```ts
const insertBook = database.prepare(
  "insert into books (id, title, author, genre, copies, year, created_at) values (?, ?, ?, ?, ?, ?, ?)",
);

insertBook.run(id, title, author, genre, copies, year, now);
```

```ts
const row = database.prepare("select count(*) as count from books").get() as { count: number };
const rows = database.prepare("select id from books order by title").all() as { id: string }[];
const result = database.prepare("delete from books where id = ?").run(id);

result.changes;          // rows affected, as a number
result.lastInsertRowid;  // the id of the row that was inserted
```

| Method | Returns |
| --- | --- |
| `run(...)` | `changes` and `lastInsertRowid`, for a write |
| `get(...)` | one row, or `undefined` |
| `all(...)` | every row, as an array |

Each `?` is a parameter, and the values are passed separately. That is what makes a query safe from injection: the statement
is compiled before the values exist, so a value can never become part of the SQL. The version to never write is:

```ts
database.prepare(`select * from books where id = '${request.params.id}'`).get();   // an injection
```

Passing the values in also means the driver can reuse the compiled statement, which is the difference between a query that
parses every time and one that does not.

`get()` returning `undefined` is the type worth respecting. The result is typed as a row *or* undefined, and the compiler
will not let a handler read a field without deciding what to do about the empty case, which is where the 404 comes from.

## Dates and booleans

SQLite has no date type and no boolean type. It has text, numbers, blobs and null, so a date is an ISO string and a boolean
is `0` or `1`. That is not a limitation to work around, it is a decision to make once:

```sql
date(loans.borrowed_on, '+' || loans.days || ' day') as due_on,
date('now') > date(loans.borrowed_on, '+' || loans.days || ' day') as overdue
```

```ts
overdue: row.overdue === 1,
```

The due date is computed by the database rather than by the application, which means every consumer of that query sees the
same value, including an `order by due_on` that sorts correctly. The mapping function turns `0` or `1` into a boolean at the
edge, and nothing above the repository sees an integer where a boolean belongs.

ISO dates in `yyyy-mm-dd` sort the same as text and compare the same as dates, which is why they are stored rather than a
locale format that does neither.

## Getting the schema in place

```ts
export function openDatabase(path: string): Database {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const database = new DatabaseSync(path);

  database.exec("pragma journal_mode = wal");
  database.exec("pragma foreign_keys = on");
  database.exec(SCHEMA);

  return database;
}
```

`create table if not exists` at boot is enough for one application with one developer and no data to preserve. It is not
enough once a column has to change on a database that has rows in it, because the statement above only ever creates. The
next step is a folder of numbered SQL files with a table that records which have run, which is what a migration tool
automates and what the schema file becomes once there is anything to preserve.

`journal_mode = wal` is the other pragma worth knowing. It lets a reader work while a writer is writing, which is what makes
one process serving many requests with one database usable at all.

`:memory:` is a path SQLite reads as a database that exists only inside the process, and it is what makes the tests in this
project as cheap as they are.

## The seed, and why it resets

```ts
export function seed(database: Database, options: SeedOptions = {}): void {
  if (options.reset) {
    database.exec("delete from loans; delete from waitlist; delete from books; delete from users;");
  }

  const existing = database.prepare("select count(*) as count from books").get() as { count: number };

  if (existing.count > 0) {
    return;
  }

  // ... inserts
}
```

Two behaviours in one function. On a laptop, the seed runs once and the work you did stays. In a test, `reset` clears the
tables first so every file starts from the same four books, which is the difference between a suite that is reproducible and
one that passes in the order somebody happened to run it.

Inserting a few rows at boot is a convenience for development. A production process that seeds on every start is one
mistake away from overwriting real data, which is why the flag is driven from the environment rather than a constant.

## Check yourself

Open a database in a scratch script, create a table with a `check` constraint, insert a row that breaks it, and read the
error. Then insert a loan for a book that does not exist with `foreign_keys` on and off, and write down what changes. Finally
run the same `select` twice with `get()` and with `all()` and compare what each returns when nothing matches.
