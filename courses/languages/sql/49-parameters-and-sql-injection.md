---
title: Parameters and SQL injection
summary: The four rows a search should have returned one of, and the one habit that prevents it.
chapter: Working with a database
minutes: 13
status: draft
---

## The demonstration

A search for a member by name, with the name put into the statement as text:

```sql
select count(*) as members from member;
```

```text
members
-------
      4
```

```sql
select count(*) as not_found from member where name = 'x' OR '1'='2';
```

```text
not_found
---------
        0
```

```sql
select count(*) as built_by_concatenation from member where name = 'x' OR '1'='1';
```

```text
built_by_concatenation
----------------------
                     4
```

The third statement is what a program builds when it assembles `"select count(*) from member where name = '" + input + "'"` and
`input` is `x' OR '1'='1`. The quotes in the input end the string literal, the `OR '1'='1'` is always true, and the count is every
row. The same trick with `drop table`, a `union select` of another table's columns, or a subquery on the users table is the same
mechanism with a worse outcome, and none of it needs any knowledge of the schema beyond how to end a string.

That is SQL injection, and it is not a database vulnerability: it is a string built by concatenation, and the database does exactly
what the string says.

## The fix is a parameter

```sql
.parameter set @name 'Ada'
select count(*) as with_parameter from member where name = @name;
```

```text
with_parameter
--------------
             1
```

A parameter is a placeholder in the statement and a value supplied separately. The engine parses the statement with the placeholder
in it, and the value never becomes part of the SQL: a value containing a quote is a value containing a quote, and no input can
change the shape of the statement.

Every engine has the syntax, and they differ only in the marker:

| Engine | Marker |
| --- | --- |
| SQLite | `?`, `?1`, `:name`, `@name`, `$name` |
| PostgreSQL | `$1`, `$2` and `$name` in some clients |
| MySQL | `?` |
| SQL Server | `@name` |

The `@name` above is the SQLite command line's own binding, and in a program the binding is done by the client library, which is
the point: the library sends the statement and the values as two separate things over a protocol built for it. The libraries in the
other courses work this way: `database/sql`'s `Query(sql, args...)` in the Go course, `JdbcTemplate` in the Spring Boot course,
and EF Core's parameterised commands in the .NET course.

## The ways injection still happens

A parameter protects a **value**. It does not protect an identifier, and it cannot, because a table name is part of the statement's
shape rather than a value in it. The three places the problem survives:

```sql
-- 1. an identifier chosen by a user
select * from {table} where id = ?          -- table is not a value

-- 2. a sort column chosen by a user
order by {column} desc                       -- column is not a value

-- 3. a list of values built as text
where id in (1, 2, 3)                        -- one placeholder per value, or a json_each
```

The first two are fixed with a whitelist: the application maps the user's choice to a name it already knows, and anything not in
the map is an error. That is a lookup in code rather than a clever escape in SQL, and it is why an identifier cannot be a
parameter.

The third is fixed by generating one placeholder per value and passing a list, which every client library supports, or by passing
the list as a single JSON value and using the engine's JSON functions to expand it. The version to avoid is joining the values
into a string, which is the injection from the top of this page with more steps.

## The other reason to use parameters

A parameterised statement is also cached. The engine parses it once and reuses the plan, which matters in a loop: a thousand
iterations of the same statement with different values parse once rather than a thousand times. The two benefits arrive together,
and the version that concatenates is slow as well as unsafe.

## Stored procedures and SQL in the application

Putting the query in a stored procedure does not prevent injection by itself. A procedure that takes a string and concatenates it
into a query has the same problem inside the database instead of outside it, which is worse because it is harder to grep for. A
procedure that takes parameters is safe for the same reason a parameterised query is.

The decision that matters is where the SQL lives, and the honest summary:

- **In the application** it is versioned with the code, tested with the code, and reviewed by whoever reviews the code. It is also
  the version that a schema change breaks at build time rather than at run time.
- **In a stored procedure** it is shared between applications, it can be granted separately from the tables, and a change does not
  need a deploy. It is also written in a dialect and in a language with weaker tooling.

The projects I have worked on keep the queries in the application and use the database for constraints, indexes and migrations. The
case for a procedure is a rule that must apply to every writer including a script run by hand, and that is a constraint more often
than it is a procedure.

## Check yourself

Write a query with the value concatenated into the string and one with a parameter, and run both with an input containing a quote.
Then take a query that builds an `IN` list from user input and rewrite it with one placeholder per value, and a query that takes a
sort column from the user and rewrite it with a whitelist.
