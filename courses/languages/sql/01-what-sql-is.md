---
title: What SQL is
summary: A declarative language over sets of rows, the five parts it is split into, and the dialects that differ.
chapter: Getting started
minutes: 13
status: draft
---

## You describe the result, not the steps

```sql
select 1 + 1 as two, 'sql' as language;
```

```text
two  language
---  --------
  2  sql
```

That statement names two columns and the engine produces one row. There is no loop, no variable and nowhere to say how to
find the data, which is the difference between SQL and every language in the rest of this catalogue: a query is a
description of a result, and the engine decides how to compute it.

The consequence is the thing worth understanding early. Two queries that return the same rows can take a millisecond and a
minute, because the engine has freedom in how it gets there. Chapter eight is about reading the plan it chose, and it is the
chapter that turns SQL from a syntax to a subject.

## It works on sets of rows

```sql
select 2 * 3 as six, 'a' || 'b' as joined;
```

```text
six  joined
---  ------
  6  ab
```

`||` concatenates and `*` multiplies, so an expression is available wherever a value is. A `SELECT` with no `FROM` clause
evaluates its expressions once and returns one row, which is how a database is used as a calculator and how a script checks
that it is connected to the engine it thinks it is.

Every other query is the same shape with a source: the engine builds a set of rows, filters it, groups it, and projects the
columns you asked for. Thinking in sets rather than in rows is most of the mental shift, and it is why a query that works on
one row often needs no change to work on a million.

## The five parts of the language

| Part | Stands for | Statements |
| --- | --- | --- |
| DQL | query | `SELECT`, and the `WITH` that precedes one |
| DML | manipulation | `INSERT`, `UPDATE`, `DELETE`, `MERGE` |
| DDL | definition | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` |
| TCL | control | `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT` |
| DCL | access | `GRANT`, `REVOKE` |

The names are worth knowing because they are how the language's documentation and its security literature are organised, and
because a database's permissions are usually granted per part: an application user needs DML and DQL, a migration step needs
DDL, and almost nothing needs DCL.

`SELECT` is the part you will write most, and it sits inside the others: `INSERT ... SELECT` copies rows, a view is a
`SELECT` with a name, and a subquery is a `SELECT` in a parenthesis.

## Dialects are real

There is a standard, published as ISO/IEC 9075, and no engine implements all of it. The four engines you are likely to meet
agree on almost everything in this course and differ in ways that matter:

| Engine | Where it differs |
| --- | --- |
| SQLite | a file rather than a server, dynamic typing, few types, no stored procedures |
| PostgreSQL | the most standard-compliant of the four, and the one this course uses as its second dialect |
| MySQL and MariaDB | its own identifier quoting, its own date functions, historically loose typing |
| SQL Server | T-SQL, `TOP` rather than `LIMIT`, and its own date and string functions |

Every example in this course runs on SQLite, because it is one binary with no server to start and its command line tool is
enough to follow along. Where PostgreSQL differs in a way that would bite you, the lesson shows both and says which one was
run, and chapter eleven collects the differences in one place.

## Where the engine sits

```text
your program  ->  a client library  ->  the engine  ->  storage
```

A server database splits that into a process you connect to and a process that owns the files, with a network protocol
between them. SQLite collapses it: the library and the engine are the same code in your program, and the storage is one
file. That is why SQLite needs no configuration and why it is the right engine for a course, a test and a desktop
application, and the wrong one for a hundred writers at once.

The client library that speaks to the engine belongs to your language's course rather than to this one. What crosses the
boundary is the SQL text and the rows, and the details that matter at that boundary are parameters instead of string
concatenation, a transaction per unit of work, and checking the error every call can return. Chapter ten covers them.

## What SQL is not

- **It is not a general-purpose language.** No loop, no recursion except through a recursive query, and no library of
  algorithms. Anything procedural belongs in the application or in a stored procedure, and a stored procedure is a dialect
  feature rather than part of the standard.
- **It does not do arithmetic exactly by default.** SQLite stores a non-integer number as a float, so money in a `REAL`
  column accumulates error. The fix is an integer count of the smallest unit, which chapter six covers.
- **It does not validate your intent.** A `DELETE` with no `WHERE` deletes every row and the engine reports success, which
  is why chapter six spends time on the guard rails and on transactions.
- **It does not abstract over the schema.** A query names tables and columns, so a schema change reaches every query that
  mentions it.

## Check yourself

Run the two queries from the top of this page and a third that returns your name and the current date. Then read the output
of `pragma table_info` for a table you create and explain every column of it.
