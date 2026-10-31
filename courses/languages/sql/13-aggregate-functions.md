---
title: Aggregate functions
summary: The five that summarise a column, what they do with NULL, and the sum of nothing.
chapter: Querying one table
minutes: 12
status: draft
---

## The five

```sql
select sum(pages) as total, avg(pages) as average, min(pages) as least, max(pages) as most from book;
```

```text
total       average        least  most
-----  ------------------  -----  ----
 1964  280.57142857142856    183   345
```

One row, because there is no `GROUP BY`: the whole result is one group. `count` is the fifth and it is the one with three
forms, from the `NULL` lesson: `count(*)` counts rows, `count(x)` counts values and `count(distinct x)` counts distinct
values.

`avg` returns a real because it divides, and 1964 divided by 7 is 280.57142857142856, which is exactly the sort of number a
report should round at the edge. `min` and `max` work on text as well:

```sql
select min(title) as first_alphabetically, max(title) as last_alphabetically from book;
```

```text
first_alphabetically     last_alphabetically
--------------------  -------------------------
A Wizard of Earthsea  The Left Hand of Darkness
```

## Every aggregate skips NULL

The `avg` above is over seven rows and not eight, and the sum is of the seven that had a page count. That is the documented
behaviour and it has a consequence: an average of a nullable column is the average of the rows that had a value, and that is
a different question from the average of all rows. The two ways to be explicit are `count(x)` alongside the average, which the
report can display, and `coalesce` inside the aggregate if a missing value should count as a zero:

```sql
select avg(pages) as avg_of_values, avg(coalesce(pages, 0)) as avg_counting_missing from book;
```

```text
avg_of_values     avg_counting_missing
------------------  --------------------
280.57142857142856                 245.5
```

The first is 280.57 over the seven known values and the second is 245.5 with the missing one counted as zero, because the
denominator changed from seven to eight. Which one is right depends on whether a book with no page count is unknown or zero.
Usually unknown, which means the first, and the second is the version that quietly reports a wrong number. That is the
argument for `NOT NULL` on a column that is always supposed to have a value.

## sum of nothing is NULL, count of nothing is zero

```sql
select sum(pages) as sum_of_nothing, count(*) as rows_when_empty, count(pages) as pages_when_empty
from book where id > 100;
```

```text
sum_of_nothing  rows_when_empty  pages_when_empty
--------------  ---------------  ----------------
                             0                 0
```

The `WHERE` matched no rows, so `count` is 0 and `sum` is `NULL`. That is the standard and it catches every report that adds
up a column with no rows: a total of `NULL` renders as blank rather than as 0, and a sum in an expression propagates the
`NULL` to everything downstream. `coalesce(sum(pages), 0)` is the fix, and `total(pages)` is SQLite's non-standard shorthand
for it.

```sql
select sum(pages) as sum_skips_null, total(pages) as total_function from book;
```

```text
sum_skips_null  total_function
--------------  --------------
          1964          1964.0
```

`total` is `sum` with a zero default and it always returns a real, which is why the second column has a decimal point. Use it
where a report needs a number rather than a blank, and be aware that its type differs from `sum`'s.

## Counting inside an aggregate

```sql
select sum(distinct pages) as sum_of_distinct, count(distinct pages) as count_of_distinct from book;
```

```text
sum_of_distinct  count_of_distinct
---------------  -----------------
           1964                  7
```

`distinct` inside an aggregate applies to the argument before the aggregate runs, so `sum(distinct pages)` adds seven distinct
values rather than seven rows. It is the function for "how many different things" and for "the total of the distinct things",
and it costs a sort or a hash to work out.

## Joining values into one string

```sql
select group_concat(title, ' | ') as all_titles from book where author_id = 1;
```

```text
                                       all_titles
----------------------------------------------------------------------------------------
The Left Hand of Darkness | A Wizard of Earthsea | The Dispossessed | Always Coming Home
```

`group_concat` is the aggregate that turns a group into one string, and the second argument is the separator, which defaults
to a comma. The order of the values inside the string is not defined unless it is controlled:

```sql
select group_concat(title, ' | ' order by title) as sorted_titles from book where author_id = 1;
```

That ordering syntax is supported in recent SQLite versions; older ones need a subquery with an `ORDER BY` inside and the
aggregate outside. `group_concat(distinct author_id)` gives `1,2,3,4`, which is the same comma-separated form a client would
split apart.

## Filtering inside an aggregate

A `FILTER` clause restricts which rows an aggregate sees, and it is supported by SQLite from 3.30 and by PostgreSQL:

```sql
select author_id, count(*) filter (where pages > 300) as long_books from book group by author_id;
```

```text
author_id  long_books
---------  ----------
        1           2
        2           1
        3           0
        4           0
```

Author 1 has two books over three hundred pages, author 2 has one, and the other two have none. The clause is evaluated per
aggregate, so a query can filter two different aggregates differently:

```sql
select sum(pages) filter (where pages > 300) as long_pages, count(*) filter (where pages is null) as missing from book;
```

```text
long_pages  missing
----------  -------
       990        1
```

The portable version is `sum(case when pages > 300 then pages else 0 end)` from the `CASE` lesson, which works in every engine
and is longer. Where the engine supports `FILTER`, it says what it means and it keeps the aggregate and its condition on one
line.

## Check yourself

Compute the total, average, minimum and maximum of a nullable column and count the values alongside. Sum a column over an empty
result and compare it with the count. Then produce two list-style strings, one joined with a comma and one with a separator of
your choice and a defined order.
