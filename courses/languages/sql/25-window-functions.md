---
title: Window functions
summary: An aggregate that does not collapse the rows, and the three ranking functions that differ on a tie.
chapter: Summarising
minutes: 13
status: draft
---

## OVER turns an aggregate into a window

```sql
select b.title, b.author_id, count(*) over (partition by b.author_id) as books_by_author
from book as b order by b.author_id, b.title;
```

```text
         title            author_id  books_by_author
-------------------------  ---------  ---------------
A Wizard of Earthsea               1                4
Always Coming Home                 1                4
The Dispossessed                   1                4
The Left Hand of Darkness          1                4
Kindred                            2                2
Parable of the Sower               2                2
Ficciones                          3                1
Frankenstein                       4                1
```

Eight rows and two columns, with the group's total repeated on every row of the group. That is what `GROUP BY` cannot do: it
would have collapsed the eight rows into four and lost the titles. The window function keeps each row and adds a summarised
value to it.

`PARTITION BY` defines the group, which here is one author. Without it the whole result set is one window:

```sql
select b.title, b.pages, sum(b.pages) over () as total, round(100.0 * b.pages / sum(b.pages) over (), 1) as percent
from book as b where pages is not null order by b.pages desc limit 3;
```

```text
         title            pages  total  percent
-------------------------  -----  -----  -------
Parable of the Sower         345   1964     17.6
The Dispossessed             341   1964     17.4
The Left Hand of Darkness    304   1964     15.5
```

An empty `OVER ()` is a window over every row, so the total appears on each one and the percentage is a division inside the
same `SELECT`. That is the report where every row knows its share of the whole, and doing it without a window function means a
subquery or a self-join.

## Ranking

```sql
select name, points, row_number() over (order by points) as rn,
       rank() over (order by points) as rnk,
       dense_rank() over (order by points) as dense_rnk
from score order by points;
```

```text
name  points  rn  rnk  dense_rnk
----  ------  --  ---  ---------
a         10   1    1          1
b         20   2    2          2
c         20   3    2          2
d         30   4    4          3
e         30   5    4          3
f         30   6    4          3
```

Six rows with a tie in the middle and a three-way tie at the top, and the three functions answer differently:

| Function | On a tie | Sequence here |
| --- | --- | --- |
| `row_number()` | a distinct number for each row | 1, 2, 3, 4, 5, 6 |
| `rank()` | the same rank, then a gap | 1, 2, 2, 4, 4, 4 |
| `dense_rank()` | the same rank, no gap | 1, 2, 2, 3, 3, 3 |

The choice matters for a leaderboard. `rank` is the one a competition uses, because two people at rank 2 mean nobody is at rank
3. `dense_rank` is the one a grade band uses, because the next distinct value is the next band. `row_number` is the one for
"take ten rows", because it never repeats.

`row_number` is also the answer to a question the ordering lesson raised: a total order. When `row_number()` is used for
pagination it needs a unique `ORDER BY`, or the ranks move between runs and a row appears twice:

```sql
select title from (select title, row_number() over (order by published, id) as rn from book) where rn <= 3;
```

```text
       title
--------------------
Frankenstein
Ficciones
A Wizard of Earthsea
```

The `b.id` in the ordering is not decoration. Without it, two books published on the same day would be ordered arbitrarily and
the page could contain a different book on each run.

## The top three with ties

```sql
select name, points, rank() over (order by points desc) as rnk from score order by points desc limit 3;
```

```text
name  points  rnk
----  ------  ---
d         30    1
e         30    1
f         30    1
```

Three rows, all rank 1, because `LIMIT 3` took three rows and three rows are tied. A query that wants "everyone in the top
three places" cannot use `LIMIT`, because the number of rows is not known in advance. It wants a filter over the rank, which
means the rank has to be computed in a subquery:

```sql
select name, points from (select name, points, dense_rank() over (order by points desc) as rnk from score) where rnk <= 3;
```

`WITH` is the readable way to write that, and the next chapter's first lesson covers it.

## Windows run after WHERE and before ORDER BY

A window function is computed at the position of `SELECT` in the evaluation order, so it cannot appear in a `WHERE`:

```sql
select title from book where row_number() over (order by pages) = 1;
```

```text
Parse error near line 2: misuse of window function row_number()
```

The fix is a subquery or a common table expression that computes the rank and an outer query that filters on it. That is the
same shape as the alias problem in the `SELECT` lesson: the thing you want to filter on does not exist yet at the point the
filter runs.

## Check yourself

Add a books-per-author count to every book row with `count(*) over (partition by ...)`, then the share of the total page count
with `sum(...) over ()`. Write the tie case with `row_number`, `rank` and `dense_rank` and explain the difference in the numbers.
Finish by selecting the rows in the top two ranks without using `LIMIT`.
