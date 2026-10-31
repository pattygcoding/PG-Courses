---
title: Cross joins and generated rows
summary: A join with no condition, a list of values as a table, and the calendar a report needs.
chapter: Joining tables
minutes: 12
status: draft
---

## A cross join multiplies

```sql
select count(*) as pairs from (select 1 as x union all select 2 union all select 3) as a
cross join (select 'a' as y union all select 'b') as b;
```

```text
pairs
-----
    6
```

Three rows times two rows is six. `CROSS JOIN` is a join with no condition, and the inner-join lesson showed the accident that
produces one: a comma with a missing `WHERE`. Writing `cross join` on purpose says that the multiplication is intended, and it
is worth the two words for the reader.

```sql
select a.x * b.y as product
from (select 2 as x union all select 3) as a
cross join (select 4 as y union all select 5) as b
order by product;
```

```text
product
-------
      8
     10
     12
     15
```

That is a multiplication table, and it is the shape of every two-dimensional report: one axis is a list of months and the other
is a list of categories.

## A list of values as a table

A cross join needs a table on each side, and reports need axes that are not in any table. A common table expression holding
literals is how they are made:

```sql
with months(month) as (values ('2026-01'), ('2026-02'), ('2026-03'))
select m.month, count(l.id) as loans
from months as m
left join loan as l on substr(l.loaned_on, 1, 7) = m.month
group by m.month order by m.month;
```

```text
month   loans
-------  -----
2026-01      2
2026-02      3
2026-03      0
```

`values ('a'), ('b')` builds a table with one column, and the `months(month)` after the name names it. The `LEFT JOIN` is the
whole point: March has no loans and the report still shows it, because the month list is the source of truth for the axis rather
than the loans table. Without the generated months, a month with no activity disappears from the report and nobody notices.

That is the row generator for a date axis, a status list or a set of expected values, and it is the pattern that turns a sparse
table into a complete report.

## Generating rows

The general problem is a series: the first of every month for a year, or the numbers 1 to 10. PostgreSQL has a function for it:

```text
 n
---
 1
 2
 3
 4
 5
(5 rows)
```

```sql
select generate_series(1, 5) as n;
```

```text
    day
------------
 2026-03-01
 2026-03-02
 2026-03-03
 2026-03-04
 2026-03-05
 2026-03-06
 2026-03-07
(7 rows)
```

```sql
select d::date as day from generate_series(date '2026-03-01', date '2026-03-07', interval '1 day') as d;
```

`generate_series` returns rows, takes numbers or timestamps, and with a step it is the date axis of any report. It also appears
in `FROM` as if it were a table, which is exactly what it is.

SQLite has no such function. A recursive common table expression is the substitute:

```sql
with recursive series(n) as (select 1 union all select n + 1 from series where n < 5)
select group_concat(n, ',') as one_to_five from series;
```

```text
one_to_five
-----------
1,2,3,4,5
```

```sql
with recursive dates(d) as (
  select '2026-03-01' union all select date(d, '+1 day') from dates where d < '2026-03-07'
)
select group_concat(d, ' ') as a_week from dates;
```

```text
                                   a_week
----------------------------------------------------------------------------
2026-03-01 2026-03-02 2026-03-03 2026-03-04 2026-03-05 2026-03-06 2026-03-07
```

The shape is a base case unioned with a step that refers to the table being built, and the `where` in the step is the
termination condition. A step that never stops is a query that runs until the recursion limit, which is worth knowing before
writing one.

## The axis does not have to come from a function

For a report that is run monthly, a `period` table with one row per month is better than generating rows every time. It is
small, it can carry columns for the period's start and end, a closed flag and a label, and a join to it is an ordinary join.
A generated series is the right tool for a one-off and a table is the right tool for a report that runs every month.

## The generated table also appears in VALUES

```sql
select 1 as one, (values (2)) as two;
```

```text
one  two
---  ---
  1    2
```

A `(values (...))` in an expression is a scalar subquery with one row, which is occasionally a tidy way to name a constant. It
is allowed in SQLite and in PostgreSQL, while a `values` list in `FROM` is a derived table in PostgreSQL and a syntax error in
SQLite:

```text
Parse error near line 83: near "(": syntax error
```

That message came from `from (values ('2026-01'), ('2026-02')) as m(month)` in SQLite 3.54. The portable version is the
common table expression form above, which both engines accept.

## Check yourself

Count the rows in a cross join of two small tables, then build a multiplication table with one. Generate the first five integers
with a recursive query and the first seven days of a month with a date series. Finish by building a report with a loan count per
month for three months, including the month with none.
