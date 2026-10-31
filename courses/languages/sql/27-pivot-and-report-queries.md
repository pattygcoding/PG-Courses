---
title: Pivot and report queries
summary: Turning rows into columns with CASE, and adding the total row that the report needs.
chapter: Summarising
minutes: 12
status: draft
---

## A pivot is conditional aggregation

```sql
select
  sum(case when author_id = 1 then 1 else 0 end) as le_guin,
  sum(case when author_id = 2 then 1 else 0 end) as butler,
  sum(case when author_id = 3 then 1 else 0 end) as borges,
  sum(case when author_id = 4 then 1 else 0 end) as shelley
from book;
```

```text
le_guin  butler  borges  shelley
-------  ------  ------  -------
      4       2       1        1
```

One row, four columns, and each column counts the rows that pass its condition. That is a pivot: values that were in rows have
become column headings, which no plain `GROUP BY` can do, because the number of rows a table header has is a decision rather
than a value.

The column list is written into the SQL, which is the limitation as well as the technique. A new author needs the query edited,
and there is no static SQL that produces a table whose shape is data. Where the columns really are dynamic, the query is built
as a string by the application, which is the one place a query is assembled textually and it has to be assembled from a
whitelist of column names rather than from input.

## The pivot with a grouped key

```sql
select author_id,
       count(*) as total,
       sum(case when pages > 300 then 1 else 0 end) as long_books,
       sum(case when pages is null then 1 else 0 end) as missing,
       sum(pages) as pages
from book group by author_id order by author_id;
```

```text
author_id  total  long_books  missing  pages
---------  -----  ----------  -------  -----
        1      4           2        1    828
        2      2           1        0    632
        3      1           0        0    224
        4      1           0        0    280
```

Rows are authors, columns are measures, and each measure is a different question about the same group. That is the shape of
almost every tabular report, and `FILTER` from the previous lesson is the tidier spelling of the same three columns where the
engine has it.

## A report with totals

```sql
select coalesce(author_id, 'total') as author, count(*) as books, sum(pages) as pages
from book group by rollup(author_id) order by author_id is null, author_id;
```

That is PostgreSQL, and it works:

```text
 author | books | pages
--------+-------+-------
 1      |     4 |   828
 2      |     2 |   632
 3      |     1 |   224
 4      |     1 |   280
 all    |     8 |  1964
```

`ROLLUP(author_id)` adds a subtotal row for the whole set. `CUBE` does every combination of the grouping columns and
`GROUPING SETS` names the combinations explicitly, and all three are the standard's answer to a report that needs subtotals at
several levels.

SQLite does not have them:

```text
Parse error near line 78: no such function: rollup
```

SQLite parses `rollup(author_id)` as a call to a function that does not exist. The portable substitute is a `UNION ALL` of the
grouped query and the total:

```sql
select coalesce(author_id, 'total') as author, count(*) as books from book group by author_id
union all
select 'total', count(*) from book;
```

```text
author  books
------  -----
     1      4
     2      2
     3      1
     4      1
total       8
```

The `coalesce` is not needed here because no `author_id` is `NULL`, and it is there for the case where the rollup produces one:
a `LEFT JOIN` with a `ROLLUP` can produce a `NULL` group to mean "the total", and that collides with a genuine `NULL` group from
the data. The standard's answer is the `GROUPING()` function, which says whether a `NULL` came from the rollup or from the
rows, and it is another of the things SQLite does not have.

## The report query I write most

```sql
with per_author as (
  select b.author_id, count(*) as books, sum(b.pages) as pages
  from book as b where b.pages is not null group by b.author_id
)
select a.name,
       p.books,
       p.pages,
       round(100.0 * p.pages / sum(p.pages) over (), 1) as share,
       sum(p.books) over (order by p.books desc, a.name) as running_books
from per_author as p join author as a on a.id = p.author_id
order by p.books desc, a.name;
```

A grouped subquery, a join to get the names, a window for the share of the total and a second window for a running count. Every
piece has appeared in this chapter and the shape repeats: aggregate first, then decorate the aggregate with windows, then join
for the labels. Doing the aggregation in a common table expression rather than in the outer query is what keeps the two windows
unambiguous, because they run over the grouped rows rather than the original ones.

## A pivot is usually better outside SQL

A static pivot with four columns is readable, and a pivot whose columns depend on the data is not something SQL is good at. The
alternatives, in the order I try them:

1. **Return rows and pivot in the client.** A report grouped by author and month is two columns in SQL and a spreadsheet in the
   client, which needs no query change when a month is added.
2. **Count per group in one column** and let the presentation decide the shape.
3. **Write the pivot in SQL** when the columns are fixed by a specification, which is the case for a report with a signed-off
   layout.

Option three is right more often than a purist would say, because the report has a fixed shape by definition. It is the
data-dependent pivot that belongs in the application.

## Check yourself

Write a pivot that counts the members by active and inactive in two columns of one row. Then add a grouped key so the pivot has
one row per author with a count of long and short books. Finish by writing the same report with a total row twice, once with
`ROLLUP` in PostgreSQL and once with a `UNION ALL` that works in SQLite.
