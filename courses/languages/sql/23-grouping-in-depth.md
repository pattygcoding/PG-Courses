---
title: Grouping in depth
summary: Grouping by an expression, by a computed bucket, and the aggregate that counts nothing.
chapter: Summarising
minutes: 12
status: draft
---

## The grouping key can be anything

```sql
select substr(published, 1, 3) || '0s' as decade, count(*) as books, group_concat(title, '; ') as titles
from book group by decade order by decade;
```

```text
decade  books                      titles
------  -----  -----------------------------------------------
1810s       1  Frankenstein
1940s       1  Ficciones
1960s       2  The Left Hand of Darkness; A Wizard of Earthsea
1970s       2  The Dispossessed; Kindred
1980s       1  Always Coming Home
1990s       1  Parable of the Sower
```

An expression in the `SELECT` list and an alias for it in the `GROUP BY` gives one group per decade, with the titles joined into
one string each. That is the shape of a report grouped by a period, a size band or a category that no column holds directly.

Sorting by the decade string works because the format is sortable. A bucket like `'under 200 pages'` does not sort in the order
anyone wants, which is why the alias in the `ORDER BY` is often paired with a separate sort column:

```sql
select case when pages > 300 then 3 when pages > 250 then 2 else 1 end as band,
       case when pages > 300 then 'long' when pages > 250 then 'medium' else 'short' end as size,
       count(*) as books, round(avg(pages), 0) as avg_pages
from book where pages is not null group by band, size order by band desc;
```

```text
 size   books  avg_pages
------  -----  ---------
long        3      330.0
medium      2      284.0
short       2      204.0
```

A numeric band column sorted descending gives long, medium, short, and the label comes along for display. That is the pairs
trick that keeps a report sorted the way a reader expects, and it costs one column nobody selects in the final output.

## The CASE decides the group

The bucket in that query was a `CASE`, which means the grouping is a policy written in SQL. Three bands, decided by two
thresholds, and the report says what it means. The alternative is a table of bands:

```sql
create table band(low integer not null, high integer not null, label text not null);
```

A join with `pages between low and high` is the version that lets the thresholds change without editing the query, and the
case statement is the version that does not need a table. Both are fine, and a range that changes per deployment usually wants
the table.

## Grouping by several keys

```sql
select author_id, count(*) as books from book group by author_id having count(*) > 1 and max(pages) > 300 order by books desc;
```

```text
author_id  books
---------  -----
        1      4
        2      2
```

`HAVING` can hold several conditions and any aggregate, so a group is kept when it is large enough and also has a long enough
book in it. `max(pages) > 300` is evaluated per group, which is the point: it is a condition on the group rather than on any
row.

## The aggregate that counts nothing

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

The two authors with no long books still appear, with a zero, because `count` over an empty set of rows is 0 while `sum` over the
same set is `NULL` from the aggregate lesson. That asymmetry is what makes `count` safe to display and `sum` not.

`FILTER` also makes a multi-column summary readable in a way the `CASE` version cannot:

```sql
select author_id,
       count(*) filter (where pages is null) as missing,
       count(*) filter (where pages > 300) as long,
       count(*) filter (where published < '1970-01-01') as old
from book group by author_id order by author_id;
```

Three independent questions, one pass over the table, and each column names its own condition. The `sum(case ...)` version is
the portable one and reads as a wall of brackets once there are three of them.

## Group by an ordinal, and why not to

```sql
select author_id, count(*) as books from book group by 1 order by 1;
```

```text
author_id  books
---------  -----
        1      4
        2      2
        3      1
        4      1
```

`group by 1` means the first column of the `SELECT` list, and it works in SQLite and PostgreSQL. It is a trap in a query that
will be edited: inserting a column at the front of the `SELECT` silently changes the grouping, and the query still runs. The
name or the expression is the version to write.

## Check yourself

Write a report grouped by the decade of publication with a count and the joined titles, sorting by the decade. Then group by a
`CASE` band and put the bands in a sensible order. Add a third column that counts the rows with a missing value, using `FILTER`
and then again with `CASE`, and compare the two.
