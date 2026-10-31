---
title: DISTINCT and grouping
summary: Removing duplicate rows, collapsing them into groups, and the column the engines disagree about.
chapter: Querying one table
minutes: 13
status: draft
---

## DISTINCT removes duplicate rows

```sql
select distinct author_id from book;
```

```text
author_id
---------
        1
        2
        3
        4
```

`DISTINCT` applies to the whole row of the `SELECT` list, not to the first column:

```sql
select distinct author_id, pages is null as pages_missing from book;
```

```text
author_id  pages_missing
---------  -------------
        1              0
        2              0
        3              0
        4              0
        1              1
```

Five rows rather than four, because author 1 appears once with pages and once without. `DISTINCT` is a row-level operation and
the columns together are what makes a row a duplicate, which is the whole of the rule and the usual reason a `DISTINCT` fails
to remove the duplicates someone expected.

A `DISTINCT` is also a sort or a hash under the hood, so it costs work proportional to the rows involved. Where it is there to
paper over a join that multiplied rows, the better fix is at the join, in chapter four.

## GROUP BY collapses rows into groups

```sql
select author_id, count(*) as books from book group by author_id order by books desc;
```

```text
author_id  books
---------  -----
        1      4
        2      2
        4      1
        3      1
```

`GROUP BY` produces one output row per distinct combination of the grouping columns, and the other columns in the `SELECT`
list have to be aggregates over each group. The author with four books is at the top, and the two authors with one each came
back in an order that is not their id: the order inside a group sort is undefined without a second key, exactly as in the
ordering lesson.

`DISTINCT` and `GROUP BY` are closely related. `select distinct author_id from book` and `select author_id from book group by
author_id` return the same rows, and the second one is the version to write when a second column might be added, because it
makes the intent explicit and it can take a `HAVING`.

## HAVING filters the groups

```sql
select author_id, count(*) as books from book group by author_id having count(*) > 2;
```

```text
author_id  books
---------  -----
        1      4
```

`HAVING` runs after the groups are formed, so it can test an aggregate, which `WHERE` cannot. The two are not
interchangeable and using both is normal: `WHERE` removes rows before grouping and `HAVING` removes groups after.

```sql
select author_id, count(*) as books, sum(pages) as total_pages
from book
where published < '1980-01-01'
group by author_id
having sum(pages) > 400
order by total_pages desc;
```

That query filters the rows, groups what remains, filters the groups and sorts the result, in that order. The order is the
evaluation order from the `SELECT` lesson, and reading it that way is how a query with several clauses is understood.

## The columns the engines disagree about

```sql
select author_id, title, count(*) from book group by author_id;
```

SQLite runs that and returns one row per author with an arbitrary title. PostgreSQL refuses it:

```text
ERROR:  column "book.title" must appear in the GROUP BY clause or be used in an aggregate function
LINE 1: select author_id, title, count(*) from book group by author_id;
                        ^
```

SQLite's behaviour is a documented extension: it picks a row from each group, which is convenient while exploring and
non-deterministic in production, so the two runs of the same query can disagree. PostgreSQL's error is the standard's rule and
the one to write against. Every column in the `SELECT` list is either in the `GROUP BY` or inside an aggregate, and a query
that wants a title per author wants a subquery or a window function instead.

## Counting distinct values

```sql
select count(*) as total, count(distinct author_id) as authors, count(pages) as with_pages from book;
```

```text
total  authors  with_pages
-----  -------  ----------
    8        4           7
```

`count(distinct x)` counts the distinct values and ignores `NULL`, `count(x)` counts the non-`NULL` values, and `count(*)` counts
rows. The three are different questions and a report that uses the wrong one is wrong in a way nobody notices. Eight books, four
authors, seven with a page count.

`count(distinct ...)` also cannot be combined with a window function's frame in every engine, and PostgreSQL's `count(distinct
x) over ()` is an error, which is the kind of limitation to expect from a distinct inside an analytic.

## Grouping by more than one column

```sql
select author_id, published >= '1980-01-01' as modern, count(*) as books
from book
group by author_id, modern
order by author_id, modern;
```

The grouping key is the combination, so each author gets up to two rows. An expression works as a key as long as it is either
repeated in the `GROUP BY` or named with an alias:

```sql
select author_id as writer, count(*) as books from book group by writer order by writer;
```

```text
writer  books
------  -----
     1      4
     2      2
     3      1
     4      1
```

SQLite and PostgreSQL both resolve an output alias in a `GROUP BY`, and neither resolves one in a `HAVING` by the standard,
which is a rule worth knowing because the failure is a confusing "column does not exist":

```text
ERROR:  column "how_many" does not exist
LINE 1: ...(*) as how_many from score group by points having how_many >...
                                                             ^
```

SQLite accepts the alias in `HAVING` as an extension, so a query that works there and fails on PostgreSQL is usually this. The
portable form repeats the aggregate: `having count(*) >= 2`.

## Check yourself

Count the books per author and sort by the count, then filter to authors with more than one. Count the total rows, the distinct
authors and the rows with a page count in one query and explain what each number means. Finish by writing a query that selects
a title alongside an ungrouped aggregate and reading PostgreSQL's error rather than SQLite's answer.
