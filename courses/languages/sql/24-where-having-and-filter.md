---
title: WHERE, HAVING and FILTER
summary: Three places to put a condition, and what each one filters.
chapter: Summarising
minutes: 11
status: draft
---

## Three places, three meanings

| Clause | Runs | Filters |
| --- | --- | --- |
| `WHERE` | before grouping | rows |
| `HAVING` | after grouping | groups |
| `FILTER` on an aggregate | inside the aggregate | the rows that aggregate sees |

They are not alternatives: a query can use all three, and each one is the right answer to a different question.

```sql
select author_id, count(*) as books, sum(pages) as pages
from book
where published < '1990-01-01'
group by author_id
having count(*) > 1
order by pages desc;
```

Read it in evaluation order: the rows published before 1990 are selected, they are grouped by author, groups with more than
one book are kept, and the result is sorted. Moving the `published` condition to `HAVING` would change the answer, because the
pages of the books it excluded were in the sum.

## The same predicate in two places

The clearest way to see the difference is to run the same condition in `WHERE` and then in `HAVING` on the same query:

```sql
select author_id, count(*) as books from book where pages > 300 group by author_id order by author_id;
select author_id, count(*) as books from book group by author_id having max(pages) > 300 order by author_id;
```

The first counts the books over three hundred pages per author. The second counts all the books per author for the authors who
have at least one book over three hundred pages. Those are different questions, and the row sets differ:

```text
author_id  books
---------  -----
        1      2
        2      1

author_id  books
---------  -----
        1      4
        2      2
```

The condition on the row belongs in `WHERE`; the condition on the group belongs in `HAVING`. A `HAVING` with a condition that
does not mention an aggregate is usually a `WHERE` that was put in the wrong place, and it is slower as well, because the
grouping is done before the rows it could have removed are removed.

## FILTER is a third place

`FILTER` sits on an aggregate and restricts what it sees without removing rows from the result:

```sql
select author_id,
       count(*) as all_books,
       count(*) filter (where pages > 300) as long_books,
       count(*) filter (where published < '1970-01-01') as old_books
from book
group by author_id
order by author_id;
```

One query, three answers per author, and no rows lost. That is what makes `FILTER` different from a `WHERE`: a `WHERE` changes
which rows exist for every aggregate in the query, while a `FILTER` changes one aggregate.

## The aggregate that cannot be filtered

Two aggregates in one query cannot be filtered differently by a `WHERE`, and `FILTER` is the fix. Before `FILTER` existed, the
technique was `sum(case when ... then 1 else 0 end)`, and that is still what to write for an engine that does not have the
clause:

| Goal | FILTER | Portable |
| --- | --- | --- |
| count rows matching | `count(*) filter (where c)` | `sum(case when c then 1 else 0 end)` |
| sum a column matching | `sum(x) filter (where c)` | `sum(case when c then x else 0 end)` |
| average matching | `avg(x) filter (where c)` | `avg(case when c then x end)` |

The third row is the one to be careful with: the portable version omits the `else` so the non-matching rows become `NULL` and
are skipped by `avg`, which is what `FILTER` does. A `else 0` there would average in a zero for every non-matching row and
produce a wrong number, so the missing `else` is deliberate.

## Which to reach for

1. **A condition on the source rows** is `WHERE`. It runs first, it is the most efficient, and it is where a filter on a date
   range or a status belongs.
2. **A condition on a group** is `HAVING`. A count above a threshold, a sum above a budget, a maximum above a limit.
3. **A different condition per aggregate** is `FILTER`. Several summary columns on one row.

A query with only `WHERE` is the commonest and the fastest. One with `HAVING` and no aggregate in it is usually a `WHERE` that
has been misplaced.

## Check yourself

Write a query with a `WHERE` on a date, a `GROUP BY` on an author and a `HAVING` on a count, and explain the order the clauses
run in. Then take a condition out of the `WHERE` and put the same one in the `HAVING` as `max(...)` or `count(...)` and show
that the rows differ. Add a `FILTER` column for the rows below a threshold and confirm the other columns do not change.
