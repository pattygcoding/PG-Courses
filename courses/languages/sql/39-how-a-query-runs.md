---
title: How a query runs
summary: The plan the engine chose, the words it uses to describe it, and why it changes with the data.
chapter: Performance
minutes: 13
status: draft
---

## EXPLAIN QUERY PLAN

```sql
explain query plan select count(*) from event where kind = 'purchase';
```

```text
QUERY PLAN
`--SEARCH event USING COVERING INDEX idx_event_kind (kind=?)
```

One line, and it says most of what matters. The table `event` is reached by a `SEARCH` rather than a `SCAN`, the index
`idx_event_kind` is used, it is a `COVERING INDEX`, and the value being looked up is `kind`. Comparing two plans for the same
query is the whole of performance work in SQL, and the two words to look for are `SCAN` and `SEARCH`:

| Word | Meaning | Cost |
| --- | --- | --- |
| `SCAN` | read every row, or every entry of an index | proportional to the table |
| `SEARCH` | jump to the matching rows through an index | proportional to the matches |

The same query with no index available:

```text
QUERY PLAN
`--SCAN event
```

That is the difference between a query that scales with the size of the table and one that scales with the size of the answer,
and it is the single thing to check when a query is slow.

## A plan is a tree

```sql
explain query plan select count(*) from event where kind = 'purchase' or at = '2026-06-15';
```

```text
QUERY PLAN
`--MULTI-INDEX OR
   |--INDEX 1
   |  `--SEARCH event USING INDEX idx_event_kind (kind=?)
   `--INDEX 2
      `--SEARCH event USING INDEX idx_event_at (at=?)
```

The indentation is the shape of the execution: the `MULTI-INDEX OR` is the top, and under it are the two sources it merges. Read
a plan inside out, from the deepest lines up, and each line is one step that feeds the one above it.

A plan with several tables in it reads the same way, and that is where the value of looking at the plan is highest: it tells you
which table the engine started from, and a join in the wrong order is a slow query with no other symptom.

```sql
explain query plan
select b.title, a.name from book as b join author as a on a.id = b.author_id;
```

```text
QUERY PLAN
|--SCAN b
`--SEARCH a USING INTEGER PRIMARY KEY (rowid=?)
```

Read from the bottom: for each row of `book` (a full scan, because there is no filter), look up the author by primary key. That is
the right plan for that query at that size, and it is the same shape for millions of rows because the lookups are by key.

## The statistics decide

The planner chooses between a scan and an index lookup by estimating how many rows each would touch, and those estimates come
from statistics the engine keeps about the table. In SQLite they live in the `sqlite_stat1` table and are written by `analyze`:

```sql
analyze;
select * from sqlite_stat1;
```

```text
  tbl  |      idx       |     stat
=======+================+==============
 event | idx_event_kind | 200000 40000
```

That row says `event` has 200,000 rows and the index's average distinct value covers 40,000 of them. Five kinds of event over
200,000 rows is 40,000 each, so the planner now knows that `where kind = 'purchase'` matches a fifth of the table, and it may
well decide a scan is cheaper than an index lookup for that.

Without statistics the planner guesses, and the guess is usually reasonable for a small table and wrong for a skewed one. That is
why `analyze` is worth running after a large load and why PostgreSQL has an autovacuum process that does it for you.

## The plan changes with the data

The same query can have a different plan on two databases with the same schema, because the data is different. A table with a
column that has three distinct values gives the planner a different estimate from one with three million, so an index that helps
on one is ignored on the other.

That is the reason to measure rather than assume, and it is also the reason a plan read once is not a fact about the query. The
sequence I follow when a query is slow:

1. **`explain query plan`** and look for `SCAN` on a table that should be searched, or a `SEARCH` with no useful condition.
2. **`analyze`** and look again, because a stale statistic is a plan chosen on wrong information.
3. **Add or change an index**, and compare the plan and the time.
4. **Rewrite the query** if the plan says the shape is the problem, such as a function on a column or a correlated subquery over
   a large table.

## EXPLAIN in PostgreSQL

```sql
explain select * from event where kind = 'purchase';
explain (analyze, buffers) select * from event where kind = 'purchase';
```

`EXPLAIN` prints the plan without running it, and `EXPLAIN ANALYZE` runs it and prints the actual row counts and times next to
the estimates. The difference between the estimated rows and the actual rows is the most useful number in the output: a plan that
estimated 20 rows and produced 200,000 has a stale statistic behind it.

`analyze` in SQLite is `ANALYZE` in PostgreSQL, and PostgreSQL's `EXPLAIN (analyze, buffers)` adds the pages read, which is how
you see whether the work was in the cache or on the disk. SQLite has no equivalent of `buffers` because the operating system's
file cache is doing that job.

## Check yourself

Run `explain query plan` on a query with a `WHERE` on an indexed column and one on a column without an index, and write down the
difference in the first line of each. Add an `or` to a query and read the plan again. Then run `analyze` and read `sqlite_stat1`
to see what the planner now knows.
