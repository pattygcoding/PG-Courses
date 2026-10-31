---
title: ORMs and query builders
summary: What they do for you, what they cost, and where the raw SQL goes.
chapter: The dialect problem
minutes: 12
status: draft
---

## Three ways to run a query

| Approach | Who writes the SQL |
| --- | --- |
| raw SQL with parameters | you |
| a query builder | the builder, from your method calls |
| an ORM | the ORM, from your object graph |

The three are on a spectrum from control to convenience, and the useful position is different for different queries in the same
application. An ORM for a create, a read by primary key and an update is a lot of typing saved. Raw SQL for a report with four
groupings is a lot of trouble avoided.

## What an ORM gives you

- **Mapping.** A row becomes an object and back, with the column-to-field mapping written once.
- **Change tracking.** An object that was modified is an `UPDATE` at the end of the unit of work, with no statement to write.
- **Identity.** Two reads of the same row give one object, so a relationship assigned twice is one object.
- **Relationships.** A foreign key becomes a property, and a join is a navigation.
- **Migrations.** A model difference generates a schema change, which is the EF Core migrations row in the migration table.
- **Parameterisation.** Every value in the generated SQL is a parameter, which removes the injection class of bug entirely.

That last one is worth stating plainly: an ORM's generated SQL is parameterised by default, so an application using one is not
vulnerable to injection through the paths it uses. The vulnerable paths are the raw-SQL escape hatches, which is where the
parameter rule from the earlier lesson comes back.

## What an ORM costs you

**The plan is not visible.** The SQL is generated, and a query with a bad plan is a query you cannot see without turning on query
logging. The first thing to do with an ORM's performance problem is to log the SQL and read the plan, and the second is to notice
that the generated SQL is not the one you would have written.

**The N+1 problem is a default.** Navigating a relationship in a loop is one query per row unless the relationship is eagerly
loaded, and it is the commonest ORM performance bug. The fix is an explicit load or a join, and the detection is query logging
again.

**A query you cannot express.** Anything with a window function, a `ROLLUP`, a recursive CTE or a dialect-specific function is
outside what a portable ORM generates, and the escape hatch is raw SQL. The first such query is fine and the tenth is a codebase
where half the data access is in one style and half in another.

**Schema changes are generated rather than decided.** An automatic migration from a model diff will happily drop a column, and the
reviewed-by-a-person step that the migration chapter insists on is exactly what a generated migration skips. EF Core's migrations
are a good tool; reading them before applying is the part that matters.

## What a query builder gives you

A builder sits in the middle: you name the columns, the conditions and the joins, and it produces parameterised SQL. You keep the
shape of the query and lose the string concatenation.

```text
select("title", "pages").from("book").where("author_id", 1).orderBy("title")
```

That reads like the SQL and generates it, and the generated statement is usually close to what you would write. It is the right
level for most application queries, and the awkward cases are the same ones an ORM has: anything outside the builder's vocabulary
needs the raw-SQL escape.

## Where the SQL should live

Whatever the approach, the same three rules apply:

1. **One layer that talks to the database.** Whether it is a repository, a data-access module or the ORM's session, it is one
   place. Request handlers that each open a connection are the shape that makes everything else harder.
2. **The raw SQL in a file or a method, not a string in a loop.** A query with a name can be found, reviewed, tested and
   explained.
3. **Parameters, always.** Which the ORM gives you and the raw SQL does not, so a project that mixes them has a rule to enforce:
   any string concatenation into a statement is a bug in review.

## The trade I make

- **An ORM for the CRUD.** Creates, reads by key, updates and the simple list queries. That is most of the statements an
  application runs, and the saved boilerplate is real.
- **Raw SQL for anything with a window function, a CTE, a recursive query or more than two joins.** Those are the queries where
  the generated version is worse than mine and the plan matters most.
- **A view for a repeated read.** If three reports need the same join, the join is a view and the ORM reads the view.
- **Query logging on in development.** The generated SQL is the thing to read when the application is slow, and having it in the
  terminal is what turns an ORM from a black box into a query generator.

None of that requires an argument about whether ORMs are good. They are, for the part of the work they cover, and the part they
cover is not the part that decides whether a database-backed application is fast.

## Check yourself

Take a query an ORM would generate for a simple read and write down the SQL you would write instead. Then write the query an ORM
would need an escape hatch for: a report with a window function and a `HAVING`. Finish by naming the three rules from this page and
saying which one your own project breaks.
