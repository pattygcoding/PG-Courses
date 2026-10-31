---
title: SELECT, FROM and WHERE
summary: The three clauses most queries are made of, the order they are evaluated in, and why an alias is not visible everywhere.
chapter: Getting started
minutes: 13
status: draft
---

## The smallest useful query

```sql
select title, pages from book where pages > 200;
```

```text
         title            pages
-------------------------  -----
The Left Hand of Darkness    304
The Dispossessed             341
```

`FROM` says where the rows come from, `WHERE` says which ones survive and `SELECT` says which columns to return. Two of the
four rows matched, and nothing says how the engine found them.

```sql
select title from book where pages > 200 and published < '1970-01-01';
```

```text
         title
-------------------------
The Left Hand of Darkness
```

A date in ISO form, `YYYY-MM-DD`, sorts and compares as text in the right order, which is why storing a date as text works.
`and` needs both conditions; `or` needs one; `not` inverts. Brackets group them, and the rule from arithmetic applies:
`and` binds tighter than `or`, so a mixed condition without brackets does something other than what a reader expects. Write
the brackets.

## An expression is allowed anywhere a value is

```sql
select title, pages * 2 as double_pages from book where pages is not null;
```

```text
         title            double_pages
-------------------------  ------------
The Left Hand of Darkness           608
A Wizard of Earthsea                366
The Dispossessed                    682
```

The multiplication happened per row, the `as` named the result, and `where pages is not null` kept the row with no page count
out of it. Arithmetic on a `NULL` produces `NULL` rather than an error, so a row with a missing value drops out of a
`where pages * 2 > 400` condition without any special handling.

## The clauses are not evaluated in the order they are written

```sql
select title, pages * 2 as double_pages from book where pages * 2 > 400;
```

```text
title  double_pages
-----  ------------
C               600
```

```sql
select title from book where double_pages > 400;
```

```text
Parse error near line 6: no such column: double_pages
```

The alias works in `SELECT` and fails in `WHERE`, and the reason is the order the engine actually evaluates:

1. **`FROM`**, building the set of rows.
2. **`WHERE`**, which filters that set using the columns of the source tables.
3. **`GROUP BY`**, which collapses rows into groups.
4. **`HAVING`**, which filters the groups.
5. **`SELECT`**, which computes the output columns and gives them their aliases.
6. **`ORDER BY`**, which sorts the result.
7. **`LIMIT`**, which takes a prefix of it.

The alias is created at step 5 and `WHERE` runs at step 2, which is why it cannot see it. `ORDER BY` runs after `SELECT`, so
it can:

```sql
select title, pages * 2 as double_pages from book order by double_pages desc;
```

That asymmetry is a source of real confusion when a query is being written, and the fix is to repeat the expression in
`WHERE` or to wrap the query in a subquery or a common table expression, which chapter nine covers.

The other useful consequence of the order is that `WHERE` cannot filter on an aggregate:

```sql
select published, count(*) from book where count(*) > 1 group by published;
```

```text
Parse error near line 3: misuse of aggregate: count()
```

Aggregates are computed at step 3, so a condition on one belongs in `HAVING` at step 4. Chapter five covers that pair
properly.

## The operators worth knowing

| Operator | Means |
| --- | --- |
| `=`, `<>`, `!=` | equal, not equal |
| `<`, `<=`, `>`, `>=` | ordering, and on text it is a byte comparison |
| `between x and y` | inclusive at both ends |
| `in (a, b)` | equal to any of the values |
| `like 'a%'` | a pattern, where `%` is any run and `_` is one character |
| `is null`, `is not null` | the only way to test for `NULL` |
| `and`, `or`, `not` | combining conditions |

```sql
select title from book where pages between 150 and 250;
select title from book where pages in (100, 300);
select title from book where title like 'A%';
```

```text
title
-----
B

title
-----
A
C

title
-----
A
```

`between` is inclusive at both ends, unlike a `range` in a programming language, which is the first thing to check when a
boundary row appears or does not. `in` is a shorter way to write a chain of `or`, and it takes a list of values or a
subquery, which is chapter three's subject.

## Precedence, brackets and truth

```sql
select title, pages from book where pages > 100 and (title = 'B' or pages = 300);
```

```text
title  pages
-----  -----
B        200
C        300
```

```sql
select count(*) as rows_matched from book where not (pages > 150);
```

```text
rows_matched
------------
           1
```

The brackets in the first query are what make it mean "more than a hundred pages, and either title B or exactly three hundred
pages". Without them, `and` would bind to `title = 'B'` and the result would be different. The second query counts the rows the
condition excludes, which is a useful habit while a condition is being worked out.

## Check yourself

Write a query that returns the title and the page count of every book with more than two hundred pages, then one that also
filters on the publication date. Use an alias for a computed column and try to filter on that alias in `WHERE` to read the
error. Finish by writing a condition with `and`, `or` and `not` and predicting which rows match before running it.
