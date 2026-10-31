---
title: Window frames and running totals
summary: The frame inside a window, the running total, and the previous row a report needs.
chapter: Summarising
minutes: 13
status: draft
---

## ORDER BY inside OVER makes a moving window

```sql
select b.title, b.published, sum(b.pages) over (order by b.published) as running_total
from book as b where pages is not null order by b.published;
```

```text
         title            published   running_total
-------------------------  ----------  -------------
Frankenstein               1818-01-01            280
Ficciones                  1944-01-01            504
A Wizard of Earthsea       1968-11-01            687
The Left Hand of Darkness  1969-03-01            991
The Dispossessed           1974-01-01           1332
Kindred                    1979-06-01           1619
Parable of the Sower       1993-10-01           1964
```

The same `sum` over the same column gives a cumulative total, because an `ORDER BY` in the window definition changes the window
from "all rows" to "all rows up to and including this one". The frame is the technical name for that set, and the default frame
when an `ORDER BY` is present is everything from the start of the partition to the current row.

That is a report's running total, and it needs no self-join and no variable. The last row is 1964, the total from the earlier
lesson, so the two agree.

## An explicit frame

```sql
select b.title, b.published, avg(b.pages) over (order by b.published rows between 2 preceding and current row) as moving_avg
from book as b where pages is not null order by b.published;
```

```text
         title            published       moving_avg
-------------------------  ----------  ------------------
Frankenstein               1818-01-01               280.0
Ficciones                  1944-01-01               252.0
A Wizard of Earthsea       1968-11-01               229.0
The Left Hand of Darkness  1969-03-01               237.0
The Dispossessed           1974-01-01               276.0
Kindred                    1979-06-01  310.66666666666669
Parable of the Sower       1993-10-01  324.33333333333331
```

`rows between 2 preceding and current row` is a frame of three rows: this one and the two before it. The first row has no
predecessors so its average is itself, the second averages two rows, and the third onwards averages three. That is why the first
two values move less smoothly than the rest.

The frame syntax is `between <start> and <end>`, where each end is one of:

| Bound | Means |
| --- | --- |
| `unbounded preceding` | the start of the partition |
| `n preceding` | `n` rows before the current one |
| `current row` | this row |
| `n following` | `n` rows after |
| `unbounded following` | the end of the partition |

An `ORDER BY` without a frame means `rows between unbounded preceding and current row`, which is the running total. Without an
`ORDER BY` the frame is the whole partition, which is the partition total. Those two defaults are the difference between a
cumulative number and a repeated one.

## ROWS and RANGE differ on a tie

`ROWS` counts physical rows and `RANGE` counts logical levels. With an ordering that has duplicates they disagree, and the table
from the window lesson makes it visible:

```sql
select name, points,
       sum(points) over (order by points rows between unbounded preceding and current row) as with_rows,
       sum(points) over (order by points range between unbounded preceding and current row) as with_range
from score order by points, name;
```

```text
name  points  with_rows  with_range
----  ------  ---------  ----------
a         10         10          10
b         20         30          50
c         20         50          50
d         30         80         140
e         30        110         140
f         30        140         140
```

`ROWS` adds one row at a time, so the three rows with 30 points get 80, 110 and 140. `RANGE` treats the tie as one level, so all
three get 140, the total after the whole tied group. Which is right depends on the question: a running total of transactions
wants `ROWS`, and a running total per distinct value wants `RANGE`.

A `RANGE` frame with `n preceding` also requires the ordering expression to be numeric, because the engine has to subtract `n`
from it, and that fails on a date. `ROWS` is the frame to reach for unless the ties are the point.

## Looking at the neighbours

```sql
select b.title, lag(b.title) over (order by b.published) as previous, lead(b.title) over (order by b.published) as next
from book as b where pages is not null order by b.published;
```

```text
         title                    previous                     next
-------------------------  -------------------------  -------------------------
Frankenstein                                          Ficciones
Ficciones                  Frankenstein               A Wizard of Earthsea
A Wizard of Earthsea       Ficciones                  The Left Hand of Darkness
The Left Hand of Darkness  A Wizard of Earthsea       The Dispossessed
The Dispossessed           The Left Hand of Darkness  Kindred
Kindred                    The Dispossessed           Parable of the Sower
Parable of the Sower       Kindred
```

`lag` reads the previous row's value and `lead` the next one, with `NULL` at the ends. That is the classic way to compute a
difference between consecutive rows, which is otherwise a self-join with a condition nobody can read:

```sql
select b.pages, b.pages - lag(b.pages) over (order by b.published) as change_from_previous
from book as b where pages is not null order by b.published;
```

```text
pages  change_from_previous
-----  --------------------
  280
  224                   -56
  183                   -41
  304                   121
  341                    37
  287                   -54
  345                    58
```

Both take an offset and a default as extra arguments: `lag(pages, 2, 0)` looks two rows back and uses 0 where there is nothing.

`last_value` is the related function that surprises people, because its default frame ends at the current row:

```sql
select name, points, last_value(name) over (order by points) as last_default,
       last_value(name) over (order by points rows between unbounded preceding and unbounded following) as last_full
from score order by points, name;
```

```text
name  points  last_default  last_full
----  ------  ------------  ---------
a         10  a             f
b         20  c             f
c         20  c             f
d         30  f             f
e         30  f             f
f         30  f             f
```

The first column is the last value *so far*, which is the current row or its tie level, and the second is the partition's last
value because the frame was widened to the end. Writing the frame explicitly is the fix, and this is the one window function
where leaving it out is almost always wrong.

## Splitting into groups of equal size

```sql
select b.title, ntile(2) over (order by b.pages) as half from book as b where pages is not null order by b.pages;
```

```text
         title            half
-------------------------  ----
A Wizard of Earthsea          1
Ficciones                     1
Frankenstein                  1
Kindred                       1
The Left Hand of Darkness     2
The Dispossessed              2
Parable of the Sower          2
```

`ntile(3)` splits the partition into three groups as evenly as it can, which is how a table is divided into quartiles or
deciles. Seven rows into two gives 4 and 3, and the remainder goes to the earlier group.

## Where the work happens

A window function needs its partition sorted, so the engine sorts, and the sort is the cost. A window over a column that an
index already orders is much cheaper than the same window over a random column, and chapter eight shows both plans. On a large
table with no usable index, a window function is a sort of the whole table, which is a different order of magnitude from a
lookup.

## Check yourself

Write a running total of the page counts by publication date, then a three-row moving average with an explicit frame. Show the
difference between `ROWS` and `RANGE` on a column with duplicate values. Use `lag` for the change from the previous row, and
finish with `last_value` twice, once with the default frame and once with the frame widened to the end.
