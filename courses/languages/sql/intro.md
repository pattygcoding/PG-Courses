---
title: SQL
level: Beginner
summary: Model a schema, query it with joins and windows, and know what the database is doing underneath.
labels:
  - Language
  - Data
  - Databases
minutes: 18
status: draft
---

## What this course is

SQL is the language a relational database speaks, and it is the one language in this catalogue that you write in order to
describe a result rather than a procedure. A query says which rows you want and the engine works out how to find them, which
is why the same statement can be instant on a hundred rows and a disaster on ten million: the language hides the execution,
and this course is as much about the execution as about the syntax.

The course covers the language end to end: the `SELECT` family, joins, aggregation and window functions, the schema
definition language, constraints, indexes and query plans, transactions, views, common table expressions and triggers. It
finishes with the parts that decide whether a database survives contact with a running system: migrations, permissions,
backups, and the differences between the dialects.

Every example runs on SQLite, and every output in these pages was produced by running it. SQLite is one binary with no
server to start, which makes it the engine for a course, and it implements the standard closely enough that the syntax you
learn transfers. PostgreSQL is the second dialect the course uses where the two differ, because it is what the Spring Boot
course in this catalogue runs against, and the differences in chapter eleven are verified rather than remembered.

The client library that runs SQL from your language of choice belongs to that language's course: `database/sql` in the Go
course, JDBC and JPA in the Spring Boot course, EF Core in the .NET course. This course is the SQL those libraries send.

## Who it is for

You have used a database, or you have written an `INSERT` from a tutorial, and you want to understand what you are sending.
Nothing assumes set theory, an index, a query plan or a transaction, and nothing assumes you have administered a server.

If you already write queries comfortably, chapters four onwards and the performance chapter are where the material starts to
be new, and chapter eleven is where the portability questions live.

## What you will build

A schema for a small domain, grown one table at a time as the queries need it, with keys, constraints and indexes that are
there because a query needed them rather than because a tutorial had them. On top of it: a set of queries that answer real
questions, a report query with a pivot and a running total, a migration file that changes the schema without losing data, and
a query whose plan you read and fix with an index.

The domain is a small library: books, authors, members, loans. It is small enough to hold in your head and rich enough to
have a many-to-many relationship, a hierarchy and a question that needs a window function.

## Prerequisites

The `sqlite3` command line tool and a terminal. Chapter two installs it, and any SQL client works for everything after that.
No server, no Docker and no programming language is required.

## How the pages are ordered

The first chapter is the model and the simplest query, because a reader who understands rows, keys and `NULL` can predict
what most of the rest will do. The next two chapters are the query language in its parts: expressions and functions, then
filtering, ordering, grouping and subqueries. Joins come before aggregation, because almost every real question needs one.
Then window functions, which are the tool for a question that groups without collapsing rows.

Modifying data and designing a schema follow, with the constraints and the migration that make a schema safe to change.
Performance is next, and it is a chapter about reading a query plan rather than about tricks. The last chapters are the
supporting parts of the language and the world around it: views, CTEs, triggers, parameters and injection, migrations,
backups, permissions, and the dialect differences.

Read them in order the first time, following the contents list on this page. The domain builds as the course goes, so the
tables from a lesson are the tables the next one uses. Each lesson ends with something to run.
