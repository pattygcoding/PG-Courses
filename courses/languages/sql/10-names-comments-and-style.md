---
title: Names, comments and style
summary: Identifiers, the quoting that changes the meaning, and the conventions worth agreeing on.
chapter: Expressions and types
minutes: 11
status: draft
---

## Identifiers are not case-sensitive

```sql
select title from book;
select TITLE from BOOK;
select "title" from book;
```

All three return the same rows. SQLite compares identifiers without regard to case, so `BOOK`, `Book` and `book` are one
table and a query that mixes them works. The case you type is kept for display in `.schema`, which is why the convention
below matters for readability rather than for correctness.

PostgreSQL does the same thing for a different reason: an unquoted identifier is folded to lowercase before it is looked up, so
`MixedCase` and `mixedcase` are the same table unless the name is quoted.

## Double quotes are for identifiers, single for strings

```sql
select 'quoted string' as s, "quoted identifier" as i;
```

```text
Parse error near line 11: no such column: "quoted identifier" - should this be a string
literal in single-quotes?
```

SQLite read the double-quoted text as a column name and told me exactly what I probably meant. The rule is worth keeping
straight because engines disagree about what a double quote does:

| Form | SQLite | PostgreSQL | MySQL |
| --- | --- | --- | --- |
| `'text'` | string | string | string |
| `"text"` | identifier | identifier | string by default |
| `` `text` `` | identifier | error | identifier |
| `[text]` | identifier | error | error |

MySQL's default is the trap: `"text"` is a string there and an identifier in the other two, so a query using a double quote
for a string works in MySQL and fails everywhere else. Use single quotes for strings and nothing else, and a linter that
enforces it is worth the setup.

## Quoting an identifier when you must

```sql
create table "Order"(id integer primary key, "select" text);
insert into "Order"("select") values ('reserved word as a name');

select id, "select" from "Order";
```

```text
id          select
--  -----------------------
 1  reserved word as a name
```

A reserved word needs quoting to be used as a name, and so does a name with a space or a capital that has to survive
folding. The engine happily creates such a table and the quoting is what makes every later query need it too:

```sql
create table order(id integer primary key);
```

```text
Parse error near line 15: near "order": syntax error
```

`ORDER` is reserved because of `ORDER BY`, so the unquoted version is a syntax error. PostgreSQL reports the same statement as
`syntax error at or near "order"`, and the fix in both is either quoting the name or choosing another one. Choosing another
one is better: a name that needs quotes in every query is a name that will be forgotten in one of them.

A reserved word as part of a longer name is fine, which is why this is allowed:

```sql
create table order_list(id integer primary key, order_date text);
```

`order_list` and `order_date` are not reserved, and this is the usual resolution: the word appears as a prefix rather than on
its own.

## The conventions I follow

- **Keywords uppercase, identifiers lowercase.** `SELECT title FROM book` rather than `select title from book`. The case has
  no meaning to the engine, and the distinction is what lets a reader see the structure of a long query at a glance.
- **Table names plural, or consistently singular.** Pick one. The library schema in this course uses singular names for
  entities and plural for none of them, and `loan` for the many-to-many table between `book` and `member`.
- **`<entity>_id` for a foreign key**, so `loan.book_id` reads as the book a loan is for.
- **`is_` or `has_` for a boolean**, so a condition reads like English: `where is_active`.
- **`created_at`, `updated_at` for timestamps**, with the unit in the name when it is not obvious: `due_date`, `total_pence`.
- **No abbreviation that is not obvious.** `published` beats `pub`, and `pages` beats `pg`.

None of this is the engine's business and all of it is the reader's, including the reader who is you in six months.

## Comments

```sql
-- a line comment, to the end of the line
/* a block comment,
   which can span lines */
select title from book;    -- a trailing comment
```

`--` comments to the end of the line and `/* */` spans lines and does not nest in standard SQL, so a block comment inside a
block comment ends at the first `*/`. Both are fine in every engine here.

Where a comment earns its place:

- The reason a query is shaped oddly, such as a workaround for a known data problem.
- A unit or a scale that the column name does not carry.
- The business rule a non-obvious condition encodes, especially a date boundary.

Where it does not: restating the SQL. `-- select the title` above `SELECT title` is noise, and a comment explaining what the
code does is a sign the code needs a better name.

## Layout

```sql
SELECT b.title,
       a.name AS author,
       COUNT(*) AS loans
FROM loan AS l
JOIN book AS b ON b.id = l.book_id
JOIN author AS a ON a.id = b.author_id
GROUP BY b.title, a.name
ORDER BY loans DESC;
```

One clause per line, one join per line, and the columns lined up under the first. A long query laid out this way can be read
one clause at a time, and a diff of it shows which clause changed. The alternative, everything on one line, is fine until the
query grows past a screen and then it is unreadable.

The convention with no argument against it: end every statement with a semicolon even where it is optional, because the day it
is required is the day you are pasting a script into a client.

## Check yourself

Run the same query with the table name in lower, upper and mixed case and confirm all three work. Then create a table with a
reserved word as its name and write two queries against it, and a second table with the word as a prefix. Finish by rewriting
your longest query with one clause per line and keywords in upper case.
