---
title: Backups and restores
summary: The copy that works while the database is open, and the restore you have actually tested.
chapter: Working with a database
minutes: 12
status: draft
---

## A file copy is not always a backup

```bash
cp library.db library.db.bak        # the version that can be wrong
```

Copying the file works when nothing is writing to it, which is the case for a database in a program that has been closed and the
case for a nightly job on a file nobody else opens. It is wrong when a write is in progress, because the copy can catch the file
between a page write and the journal that makes it atomic, and the result is a database that fails an integrity check.

SQLite can be in the middle of a write at any moment, so the safe copies are the ones that ask the engine:

```sql
vacuum into '.tsql/backup_test.db';
```

```text
backup written
```

```text
backup file size: 40960
```

`VACUUM INTO` writes a compact copy of the whole database to a new file, atomically with respect to other writers, and produced a
40 KB file here. It is the one-statement backup, it needs no tool, and it is what a script that copies a database should call. The
file it writes is also already vacuumed, so it is smaller than the original and can be opened read-only straight away.

```bash
sqlite3 library.db ".backup library.db.bak"
```

The `.backup` dot command does the same thing from the command line, and it can be given a page count to do it in steps, which
lets a long backup run without holding one lock for the whole time. Both are the official answers, and both are safer than a file
copy.

## What a backup has to contain

A database file is not the only state an application has. The list to check:

| In the file | Outside it |
| --- | --- |
| the tables and their data | the migration files that built the schema |
| the indexes and triggers | the application version that wrote it |
| the views | the configuration and the connection strings |
| the schema version, in `schema_migrations` | the credentials that reach it |

The second row is the one that turns a restore into an incident: a backup from three weeks ago restores a schema the current
application cannot read, and the migrations between then and now are needed to bring it forward. A backup of a database and the
revision of the code that wrote it is the unit that restores.

## PostgreSQL

```bash
pg_dump -Fc library > library.dump
pg_restore -d library_new library.dump
pg_dump --schema-only library > schema.sql
pg_dump --data-only --table=book library > book.sql
```

`pg_dump -Fc` writes the custom format, which compresses and which `pg_restore` can restore selectively or in parallel. A plain
`.sql` file is `-Fp` and is readable, which is useful for a small database and for reading what the dump contains.

`pg_dump` takes a consistent snapshot without blocking writers, so it can run against a live database. What it cannot do is
capture the writes that happen during the dump, so a restore from it is the state at the moment the dump started, and anything
written since is lost. For a database where that matters, the answer is continuous archiving or replication, which is
administration rather than SQL.

`pg_dumpall` adds the roles and the tablespaces, which `pg_dump` does not include.

## The restore is the part you have not tested

A backup that has never been restored is a file whose size suggests it is fine. The only evidence that matters is a restore that
produced a working database, and it is worth doing on a schedule:

```bash
sqlite3 restored.db "pragma integrity_check;"
sqlite3 restored.db "select count(*) from book;"
```

`pragma integrity_check` walks every page and reports corruption by page, and it is the first thing to run on a restored file. The
second query is the one that says whether the data is there, and it should be a count of the largest table rather than a count of
one row that happens to exist.

A restore test that takes a copy of the backup, opens it, runs the integrity check and counts a few tables is a script, a
scheduled job and a notification when it fails. The alternative is discovering in an incident that the backup job has been writing
zero-byte files for a month, which happens more often than anyone expects.

## The difference between a backup and an export

| | Backup | Export |
| --- | --- | --- |
| contains | everything, including indexes and settings | the rows you asked for |
| restores | the database | the table |
| format | the engine's | CSV or JSON |
| for | recovery | a report, a migration, a handover |

`VACUUM INTO` and `pg_dump` are backups. A `select` written to a CSV is an export, and it is not a substitute: it has no schema,
no constraints and no way to distinguish a column that was empty from one that was `NULL`. A CSV of a table is a reasonable thing
to hand a colleague and it is not a recovery plan.

## Where the copies live

Three rules from watching this go wrong:

- **A backup on the same disk is not a backup.** The failures that need a restore include the disk.
- **A backup nobody can read is not a backup.** If the file is encrypted with a key in a password manager that one person can open,
  write the process down.
- **Retention is a decision.** Seven daily copies and four weekly ones cover two different mistakes; thirty daily copies cover
  one. The cost is disk space and the benefit is being able to go back further than the moment the problem started.

## Check yourself

Back up a database with `VACUUM INTO`, then open the copy, run `pragma integrity_check` and count a few tables. Compare the size
of the copy with the original and explain the difference. Finish by writing down what a restore of your own database would need
besides the file.
