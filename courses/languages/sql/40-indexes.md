---
title: Indexes
summary: The structure behind a lookup, the column order that decides, and the measured difference it makes.
chapter: Performance
minutes: 13
status: draft
---

## What an index is

An index is a sorted copy of one or more columns with a pointer back to the row. It is a B-tree, which means every lookup is a
handful of page reads rather than a walk through the table, and it means the index is ordered, so a range query and a sort can use
it too.

The cost is that the copy has to be maintained: every `INSERT`, `UPDATE` and `DELETE` writes the index as well as the table. An
index makes reads faster and writes slower, and a table with eight indexes pays eight times on every write. That is the trade, and
the case for an index is a query that needs it.

## The measured difference

A table of 200,000 events, counting the rows for one date, fifty times in one process:

```text
SCAN event                                      0.007799 s per query
SEARCH using COVERING INDEX idx_event_at (at=?)  0.000050 s per query
```

**About 150 times faster**, on the same data with the same query: 7.8 milliseconds per query against 50 microseconds. The index
was the only difference, and the plan tells you why: the scan reads 200,000 rows and the search reads the 548 that match.

An index is worth its write cost when a query reads a small fraction of a large table, which is the case for almost every query
an application makes: one customer, one order, one session, one date range.

## Creating one

```sql
create index idx_event_at on event(at);
create unique index idx_member_email on member(email) where email is not null;
```

`CREATE INDEX` builds it and takes a write lock while it does, so on a large table it is a maintenance operation rather than
something to run from an application. `CREATE INDEX CONCURRENTLY` in PostgreSQL builds without blocking writers, at the cost of
being slower and being unable to run inside a transaction.

A **partial index** has a `WHERE` clause and covers only the rows that match, which makes it smaller and cheaper to maintain. The
example above is the index for a unique email that ignores the rows with none, and a partial index on `where status = 'open'` is
the right shape for a queue table where the open rows are a tiny fraction and the closed ones are most of the table.

## The column order in a composite index

A composite index on `(kind, at)` is sorted by `kind` first and by `at` within each kind, and that order decides which queries it
can serve:

```sql
create index idx_event_kind_at on event(kind, at);

explain query plan select count(*) from event where kind = 'purchase' and at = '2026-06-15';
explain query plan select count(*) from event where kind = 'purchase';
explain query plan select count(*) from event where at = '2026-06-15';
```

```text
`--SEARCH event USING COVERING INDEX idx_event_kind_at (kind=? AND at=?)
`--SEARCH event USING COVERING INDEX idx_event_kind_at (kind=?)
`--SEARCH event USING COVERING INDEX idx_event_at (at=?)
```

Both the full condition and the leading column alone are served by the composite index. The third query, using only `at`, falls
back to the single-column index, because an index sorted by `kind` first cannot find a date without knowing the kind. That is the
**leading-column rule**: an index on `(a, b)` serves `a`, and `a and b`, and not `b` on its own.

It is the rule that decides the column order, and the second column is not wasted: an index on `(a, b)` also serves a query that
filters on `a` and sorts by `b`, because within each `a` the rows are already in `b` order.

```sql
explain query plan select kind, count(*) from event where kind = 'purchase' group by kind;
```

```text
`--SEARCH event USING COVERING INDEX idx_event_kind_at (kind=?)
```

That query groups by the leading column and the index serves the grouping too, because the rows arrive already grouped. An index
that matches a query's `WHERE`, `GROUP BY` and `ORDER BY` in one go is the best index available for it.

## A covering index

An index that contains every column a query needs is **covering**, and the engine never reads the table:

```text
`--SEARCH event USING COVERING INDEX idx_event_kind (kind=?)
```

`count(*)` over `where kind = 'purchase'` needs the count and the kind, both of which are in the index, so the table is not
touched. That is why the earlier measurement was possible at all: the whole query was answered from the index.

Both SQLite and PostgreSQL print `COVERING INDEX` (PostgreSQL says `Index Only Scan`) and both reward a query whose columns are
all in one index. It is the reason a composite index with an extra column is sometimes the right answer, and the reason an index
that is only one column short of covering is often worth widening.

## When an index is not used

An index is a choice the planner makes, and it can decline. The next lesson is the cases where an index exists and does not help,
which is a longer list than most people expect and the reason a plan is worth reading before adding one.

## Check yourself

Create an index on a column of a large table and measure the same query with and without it, using the plan before the clock.
Then create a composite index and check which of three queries it serves: both columns, the leading one alone, and the trailing
one alone. Finish by widening an index so a query's columns are all in it and looking for `COVERING INDEX` in the plan.
