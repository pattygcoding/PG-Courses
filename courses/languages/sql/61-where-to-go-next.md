---
title: Where to go next
summary: The parts of SQL this course left out, the neighbours that cover them, and what to practise.
chapter: Where to go next
minutes: 11
status: draft
---

## What this course covered

The language end to end, on a schema that grew as the queries needed it:

- The relational model, `NULL` and three-valued logic, types and storage classes.
- The query language: filtering, ordering, grouping, aggregates, joins of every kind, subqueries, window functions and frames.
- Writing data: `INSERT`, `UPDATE`, `DELETE`, upserts and transactions.
- Designing a schema: keys, constraints, referential integrity, normalisation and alterations.
- Performance: query plans, indexes and the cases where they do not help, statistics, vacuum and file layout.
- The supporting parts: views, CTEs, recursive queries, triggers and full-text search.
- The world around it: parameters and injection, migrations, backups, permissions, the dialects and the standard.

## What it deliberately did not

**Administration.** Replication, failover, connection limits, tuning shared memory and reading a server's own metrics are a
different job from writing SQL. The pieces this course did cover, backups and permissions, are the ones a developer needs and
cannot delegate.

**Data modelling at scale.** Dimensional modelling, star schemas, slowly changing dimensions and the vocabulary of a warehouse are
a subject of their own. The normalisation chapter is the relational half of it: a warehouse deliberately breaks those rules for
read performance, and doing that on purpose needs the rules first.

**Stored procedures as a language.** PL/pgSQL, T-SQL and the rest are procedural languages inside a database, with loops,
exceptions and packages. This course covered triggers as a mechanism and stopped short of writing a program in one.

**Query optimisation beyond indexes.** Partitioning, materialised views and statistics tuning are tools for a problem that a plan
and an index did not solve, and the order matters: the plan first.

**The client libraries.** They belong to the language courses. The SQL that crosses the boundary is what this course taught.

## The neighbours in this catalogue

- **The Go course** covers `database/sql`, a driver interface whose shape depends on the database. The SQL it sends is this
  course's subject.
- **The Spring Boot course** covers JDBC, JPA, Flyway migrations and Testcontainers against PostgreSQL, which is the second
  dialect used here.
- **The .NET course** covers EF Core, including the migrations and change tracking the ORM lesson described.
- **The Python, TypeScript and JavaScript courses** cover the languages that most often talk to a database for a script or a web
  front end.
- **The Java course** covers the language and the JDK, with the persistence layer living in the Spring Boot course.

The Go course's last lesson says its database layer was left as a pointer, because a driver's shape depends on the database. This
course is the other half of that pointer: the SQL itself and what the engine does with it.

## What I would practise

Reading is not the same as writing a schema under pressure, so the practice that matters is the kind with a wrong answer you can
find.

1. **Exercises against a real engine.** A schema, a set of questions and the expected output, with something to run the query in.
   A site with an actual database behind it beats one that only checks your SQL text.
2. **A schema you own.** The booking system from the previous page, or a system from your own work, designed from the description
   and reviewed with the checklist.
3. **Someone else's slow query.** Take a query from a codebase, read its plan, and write down what you would change and what it
   would cost. The plan is the answer key.
4. **A migration you have to undo.** Write a schema change and then the change that reverses it without losing data. The second
   half teaches the most.
5. **An import of a real file.** A CSV from somewhere public, with the messy rows it really has, loaded into a staging table and
   moved into a schema you designed. The reporting step is the one that is always underestimated.

## The habit that matters most

Every claim in this course about behaviour came from running the statement, and several of them turned out to be the opposite of
what I expected when I wrote them down. The recursive query that would not compile because the column list did not carry the key it
joined on; `ANY` and `ALL` being a syntax error in SQLite; a leading wildcard not getting the optimization I expected; the booking
insert that silently accepted an overbooking. None of those would have been caught by reading a documentation page carefully.

So the habit is this: run the statement, look at the plan, and read the error. A database is unusually good at telling you what it
did, and the two tools that show it are `explain query plan` and the error message.

## The reference shelf

- **The engine's own documentation.** SQLite's is one page per topic and complete. PostgreSQL's is longer and the best-written
  database documentation there is. Both describe what the engine actually does, which is the thing you need.
- **The standard**, when the question is about what is portable rather than what works. ISO/IEC 9075, not free, and worth knowing
  exists.
- **Your own slow query log.** The best source of things to learn, because every query in it is one you wrote.

## Thank you

If you have read this far, you can model a schema, query it, read a plan, change it safely and move it between engines. That is
more than most people who use a database can do, and it is the point at which the remaining learning is about other people's
systems rather than about the language.

## Check yourself

Pick one query from a codebase you work with and write down its plan, its row count and what you would change. Then design a small
schema from a description and run the checklist against it. Finish by writing down the three things from this course that turned
out to be different from what you expected.
