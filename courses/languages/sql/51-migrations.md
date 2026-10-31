---
title: Migrations
summary: Versioned files that run once, the change that needs two steps, and the one rule that keeps schemas honest.
chapter: Working with a database
minutes: 13
status: draft
---

## A migration is a file that runs once

```sql
create table schema_migrations(
  version text primary key,
  applied_at text not null default (datetime('now'))
);

insert into schema_migrations(version) values ('001_create_book.sql');

select version, applied_at from schema_migrations;
```

```text
      version            applied_at
-------------------  -------------------
001_create_book.sql  2026-10-31 07:02:23
```

The table is the whole mechanism: a list of the migrations that have run. A tool reads the files in order, compares them against
the versions in the table, and runs the ones that are missing. Everything else a migration tool does is convenience.

The naming convention is a zero-padded number, a separator and a description, which sorts correctly and says what the file does:

```text
migrations/
  001_create_book.sql
  002_add_author_table.sql
  003_add_price_to_book.sql
  004_index_loan_book_id.sql
```

## The order of a migration

```text
begin;
  -- the change
  insert into schema_migrations(version) values ('003_add_price_to_book.sql');
commit;
```

The change and the record of it are in the same transaction, so a migration that fails halfway leaves neither. SQLite and
PostgreSQL support transactional DDL and this works; MySQL does not, and its migrations have to be written so that a partial
application is recoverable, which is a different discipline.

```bash
sqlite3 library.db < migration.sql          # with .bail on as the first line
psql -v ON_ERROR_STOP=1 -f migration.sql
```

The `ON_ERROR_STOP` and `.bail` from the first chapter are what make this a script that fails loudly. Without one of them, a
migration with an error in the middle applies half of itself and reports success, which is the worst outcome available.

## The change that needs two migrations

Adding a `NOT NULL` column to a table with rows in it fails, because the existing rows have no value for it. The safe sequence on a
large table is three deployments:

```sql
-- migration 005: add the column, nullable, with no constraint yet
alter table book add column price_pence integer;

-- the application now writes it on every insert and update

-- migration 006: backfill the existing rows
update book set price_pence = 0 where price_pence is null;

-- migration 007: now the constraint can be added, in a table copy for SQLite
```

That is "expand, migrate, contract", and the reason for the ceremony is that the schema is compatible with both the old and the new
version of the application at every step, so the deploy and the migration do not have to happen at the same instant. The version
that changes a column in place needs the application updated first, or a window with no traffic.

## Destructive changes

A migration that drops a column or a table takes data with it, and the rollback is a restore.

- **Rename before dropping, and wait.** `alter table book rename column price to price_old` in one release and the `drop` in the
  next. The gap is the window in which a mistake is recoverable with an `ALTER` rather than a restore.
- **Drop the code first, then the column.** A column that nothing reads can be dropped safely, and finding out that something
  still read it should happen before the drop.
- **Never drop in the same release that adds.** A rollback of the deploy then has no reverse migration, because the data is gone.
- **Back up before a destructive migration.** This is the one place a backup is not optional.

## The lock a migration takes

An `ALTER TABLE` and a `CREATE INDEX` take a lock that blocks writers, and on a large table the time is proportional to the rows.
Three ways to reduce it:

- **`CREATE INDEX CONCURRENTLY`** in PostgreSQL builds without blocking writers. It cannot run inside a transaction, so it does not
  fit the wrap-everything pattern above.
- **Batches.** A backfill of a million rows should be many statements of a few thousand, each in its own transaction, with the lock
  released between them. One transaction holding a write lock for ten minutes is an outage.
- **A quiet moment.** Where neither of the above applies, the migration runs when the load is lowest, and that is a decision to
  make rather than to discover.

## The one rule

**Never edit a migration that has already run somewhere.**

If `003_add_price_to_book.sql` ran on a colleague's machine and you change it, the two databases have different schemas and the
migration table says they are the same. The symptoms appear later: a query that works locally fails on staging and nobody can see
why, because both report version 003.

The fix is always a new file. A typo in a migration that has run once, on your own machine and nowhere else, is the only case where
editing is an option.

## Where the migrations live

The files belong in the same repository as the application, in one directory, ordered by name:

- **A deploy applies its own migrations**, so the code and the schema it expects move together.
- **A code review includes the schema change**, which is where a missing index or a destructive drop gets noticed.
- **A checkout of an old revision has the schema for it**, which is half of what makes a bug reproducible.

The alternative, a database administered by hand with changes applied as somebody remembers them, produces a staging database that
nobody can recreate and a production schema that matches neither of the two files claiming to define it.

## The tooling

| Tool | Engine | Notes |
| --- | --- | --- |
| Flyway | any via JDBC | used by the Spring Boot course in this catalogue |
| Liquibase | any via JDBC | XML, YAML or SQL changesets |
| Alembic | PostgreSQL, MySQL | Python, paired with SQLAlchemy |
| EF Core migrations | SQL Server, PostgreSQL, SQLite | generated from the model, in the .NET course |
| goose, golang-migrate | any | `database/sql` drivers, in the Go course |
| `psql` and a shell script | PostgreSQL | the version with no dependency at all |

The last row is not a joke: for a single database and one deploy pipeline, a directory of numbered `.sql` files and a script that
applies the missing ones is twenty lines with no upgrade path to maintain. A tool earns its place when several people, several
environments or several engines are involved.

## Check yourself

Create a `schema_migrations` table and a pair of numbered files, and apply them in order with a script that records each one. Write
a migration that adds a `NOT NULL` column to a table with rows in it and watch it fail, then write the three migrations that do it
safely. Finish by writing down which of your migrations would need a restore to undo.
