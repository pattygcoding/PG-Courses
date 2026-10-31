---
title: NULL and three-valued logic
summary: The value that means "unknown", the comparison that never matches, and the aggregate that skips it.
chapter: Getting started
minutes: 13
status: draft
---

## NULL is not a value

```sql
select * from book where pages = null;
```

```text
id  title  pages  published
--  -----  -----  ---------
```

No rows. The row with no page count is in the table and `pages = null` did not match it, because `NULL` does not mean "a
value that is empty": it means "unknown", and comparing anything to an unknown produces unknown rather than true.

```sql
select * from book where pages is null;
```

```text
id        title         pages  published
--  ------------------  -----  ---------
 4  Always Coming Home
```

`IS NULL` and `IS NOT NULL` are the only ways to test for it. Every other operator, including `=`, `<>`, `in`, `between` and
`like`, returns unknown when a side is `NULL`, and a row whose `WHERE` clause is unknown is not returned.

## Arithmetic and concatenation propagate it

```sql
select 'a' || null as concat_null;
```

```text
concat_null
-----------
```

```sql
select pages, pages + 1 as plus_one from book;
```

```text
pages  plus_one
-----  --------
  304       305
  183       184
  341       342

```

The concatenation is `NULL`, and the row with no pages produced `NULL` rather than an error or a zero. That is the useful
half of the rule: a missing value stays missing through an expression instead of quietly becoming 0, so a wrong number is
harder to produce by accident.

The inconvenient half is that a `WHERE` on such an expression excludes the row:

```sql
select title from book where pages + 1 > 300;
```

The row with `NULL` is not returned, which is usually what you want and occasionally what you did not mean. `coalesce`
substitutes a value where the missing case needs one:

```sql
select coalesce(pages, 0) as pages_or_zero from book;
```

```text
pages_or_zero
-------------
          304
          183
          341
            0
```

## Comparing NULL to NULL is unknown

```sql
select null = null as null_equals_null, null is null as null_is_null;
```

```text
null_equals_null  null_is_null
----------------  ------------
                             1
```

The first column is empty because it is `NULL`, not because it is false. That is the whole of three-valued logic: a
condition is true, false or unknown, and only true passes a `WHERE`. It is why `NULL` is not equal to itself, which is
surprising until you read `null = null` as "is this unknown equal to that unknown", and the answer is that nobody knows.

The practical consequence is that a `UNIQUE` constraint in SQL treats two `NULL`s as not conflicting, so a table with a
nullable email column allows any number of rows with no email. Chapter seven covers what to do about that.

## The comparison with a list

```sql
select 3 in (1, null, 3) as in_with_null, 2 in (1, null, 3) as two_in_with_null;
```

```text
in_with_null  two_in_with_null
------------  ----------------
           1
```

`3` is in the list, so the answer is true. `2` is not equal to any of the members, but the list contains a `NULL`, so the
answer is unknown rather than false. That is the trap that makes this query return no rows at all:

```sql
select title from book where id not in (select pages from book);
```

`NOT IN` with a subquery that produces a single `NULL` is unknown for every row, so the query returns nothing however many
rows should match. The fix is to add `where pages is not null` to the subquery, or to use `NOT EXISTS`, which chapter three
covers.

## Aggregates skip it

```sql
select count(*) as total, count(pages) as with_pages from book;
```

```text
total  with_pages
-----  ----------
    4           3
```

`count(*)` counts rows and `count(pages)` counts the rows where `pages` is not `NULL`, which is the difference between the
two functions that everyone gets wrong once. `sum`, `avg`, `min` and `max` ignore `NULL` inputs as well:

```sql
select sum(pages) as total_pages, avg(pages) as average_pages from book;
```

```text
total_pages  average_pages
-----------  -------------
        828          276.0
```

828 divided by 3 is 276, not 207: the average was computed over the three rows that had a value. That is usually what you
want and it is silent, so a report that averages a nullable column is reporting the average of the rows that had data.

## The rules

1. `IS NULL`, `IS NOT NULL`, and never `= NULL`.
2. A condition that is unknown does not match, so a `WHERE` can silently drop rows.
3. An expression with a `NULL` is `NULL`.
4. `count(*)` counts rows and `count(col)` counts values.
5. `NOT IN` against a set that contains `NULL` matches nothing.
6. Decide per column whether `NULL` is allowed, and prefer `NOT NULL` with a default when it is not.

Nothing about `NULL` is specific to SQLite; the behaviour above is the standard, and PostgreSQL and MySQL are the same.

## Check yourself

Insert a row with a `NULL` in one column, then select it with `= NULL` and with `IS NULL` and compare. Run the two `count`
forms and the two `IN` forms from this page, then write a `NOT IN` query against a subquery that returns a `NULL` and add the
`IS NOT NULL` that fixes it.
