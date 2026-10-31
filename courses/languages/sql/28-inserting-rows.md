---
title: Inserting rows
summary: One row, many rows, the columns that come from a query, and the defaults that fill the rest.
chapter: Modifying data
minutes: 12
status: draft
---

## One row and many

```sql
insert into member(name, joined) values ('Jorge', '2026-03-01'), ('Marie', '2026-03-02');

select id, name, joined, is_active from member order by id desc limit 3;
```

```text
id    name       joined    is_active
--  ---------  ----------  ---------
 6  Marie      2026-03-02          1
 5  Jorge      2026-03-01          1
 4  Katherine  2025-02-10          1
```

A multi-row `VALUES` list is one statement and therefore one transaction, which is the reason to prefer it over a loop of single
inserts: the engine commits once, and the rows either all arrive or none do. The `id` values were assigned by the engine and
`is_active` came from the column's default, so neither appeared in the statement.

Naming the columns is the habit from the first chapter, and it is what lets the engine fill the defaults. A positional `insert
into member values (...)` has to supply every column in order, including the ones with defaults and the one the engine assigns,
so it is both longer and fragile.

## Taking the rows from a query

```sql
insert into member(name, joined) select 'Copy of ' || name, joined from member where id <= 2;
```

```text
id      name
--  -------------
 7  Copy of Ada
 8  Copy of Grace
```

`INSERT ... SELECT` copies rows, and the select is an ordinary query: it can join, filter, aggregate and generate values. It is
how a table is seeded from another, how a staging table is loaded into the real one, and how a report's input is materialised
for a later step.

The number of rows is not known in advance, which is the property to remember for a backup or a migration: the statement
succeeded and the count it reported is the answer to "how many", so recording it is worth the line.

## The defaults do the rest

```sql
insert into member default values;
```

```text
Error near line 91: NOT NULL constraint failed: member.name
```

`DEFAULT VALUES` inserts a row with every column at its default, and here it failed because `name` is `NOT NULL` and has no
default. The engine refused the row rather than inventing a value, which is the constraint working. Where a row with all
defaults makes sense, as in a table of settings or an events table with a timestamp default, `DEFAULT VALUES` is the shortest
insert there is.

A default is written as part of the column and can be a literal, `CURRENT_TIMESTAMP`, `NULL` or an expression in parentheses:

```sql
create table event(
  id integer primary key,
  happened_at text not null default (datetime('now')),
  kind text not null,
  payload text
) strict;
```

`datetime('now')` in parentheses is evaluated per row, and `CURRENT_TIMESTAMP` is the standard's spelling for the same thing.
An expression default that is not deterministic, such as one that reads the clock, is worth thinking about before it goes into
a table that will be compared between environments.

## Getting the id back

An insert into a table with an assigned key produces a value the application usually needs, and there are three ways to reach
it. `last_insert_rowid()` is SQLite's function for the id of the last insert on the connection, `RETURNING` is the standard's
way and works in SQLite 3.35 and later:

```sql
insert into book(title, author_id, pages, published, price_pence)
values ('A new book', 1, 200, '2026-01-01', 999)
returning id, title;
```

`RETURNING` gives back whichever columns the statement produced, for `INSERT`, `UPDATE` and `DELETE`, and it is the version to
prefer because it is one statement rather than two and it cannot be confused by another insert happening on the same
connection.

A client library has its own spelling for this, and the shape differs between them: a `lastInsertId` value, an output parameter,
or a fetch from the returned rows. That is chapter ten's subject, and the requirement it has to meet is the one this section
covers: the id comes back from the insert rather than from a second query that might race with another writer.

## Inserting into a table with a foreign key

```sql
insert into loan(book_id, member_id, loaned_on, due_on) values (3, 1, '2026-03-01', '2026-03-15');

select id, book_id, member_id, due_on from loan order by id desc limit 1;
```

```text
id  book_id  member_id    due_on
--  -------  ---------  ----------
 6        3          1  2026-03-15
```

The id was assigned and the two foreign keys were supplied. Nothing checked that book 3 and member 1 exist, because foreign keys
are off by default in SQLite, so this insert would have succeeded with a book id that points at nothing. Chapter seven turns the
check on, and it is the setting most worth changing on a new database.

## Multi-row inserts and the parameter limit

A multi-row insert builds one statement with a placeholder per value, and every engine has a limit on how many a statement can
hold: SQLite's is 32766 variables by default, PostgreSQL's is 65535. A batch of a million rows therefore cannot be one
statement, whatever the syntax allows, and the practical shape is a loop over batches of a few hundred rows inside one
transaction.

```sql
begin;
insert into member(name, joined) values ('Ada', '2026-01-01'), ('Grace', '2026-01-02');
insert into member(name, joined) values ('Alan', '2026-01-03');
commit;
```

That is the pattern for a load: one transaction, many statements, commit at the end. Without the transaction each statement is
its own commit, and the difference in speed is hundreds of times on a real disk, because a commit is a flush.

## Check yourself

Insert two rows in one statement, then copy some rows from the same table with `INSERT ... SELECT`. Insert a row with the
defaults and read the error when a `NOT NULL` column has none. Insert a row into a table with an assigned key and get the id
back with `RETURNING`, then again with `last_insert_rowid()`.
