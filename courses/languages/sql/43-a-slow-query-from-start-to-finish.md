---
title: A slow query from start to finish
summary: The order I work in, the two mistakes that waste the time, and the measurement that ends it.
chapter: Performance
minutes: 12
status: draft
---

## The order I work in

1. **Measure it.** A query is not slow until you have a number, and "the page takes two seconds" usually means two seconds
   including an HTTP request, a template render and a network round trip. Get the query's own time and the number of rows it
   returns.
2. **Read the plan.** `explain query plan` in SQLite or `explain analyze` in PostgreSQL. Look for a `SCAN` where a `SEARCH` is
   possible, and in PostgreSQL compare the estimated rows with the actual.
3. **`analyze` and read the plan again.** A stale statistic is a plan chosen on wrong information, and it is free to rule out.
4. **Find the column the filter is on** and check whether it has an index, what the index's leading column is, and whether the
   query transforms the column.
5. **Add or change one index.** One. Then measure and read the plan.
6. **Rewrite the query** only if the plan says the shape is the problem: a function on a column, a correlated subquery per row, an
   `or` across two large tables.

Steps 4 and 5 in that order, and one change at a time, because two changes at once leave you not knowing which one worked.

## The worked example

The query: the count of one kind of event, on a table of 200,000 rows.

```sql
select count(*) from event where kind = 'purchase';
```

**Measure.** 47 ms per query with the command line tool, which includes reading the file from disk. Repeated fifty times inside
one process, it is 1.1 ms for a `count(*)` that filters on a column with five values.

**Read the plan.**

```text
QUERY PLAN
`--SCAN event
```

A scan of 200,000 rows for a filter, so there is no index on `kind`.

**Check the column.** `kind` has five distinct values, so an index on it alone returns a fifth of the table and will not help, which
the previous lesson measured at 215 ms against 223 ms. The filter is not wrong, the column is.

**What would help.** If the query also filtered on a date, an index on `(kind, at)` would find the small date range inside the
kind:

```sql
create index idx_event_kind_at on event(kind, at);
explain query plan select count(*) from event where kind = 'purchase' and at = '2026-06-15';
```

```text
QUERY PLAN
`--SEARCH event USING COVERING INDEX idx_event_kind_at (kind=? AND at=?)
```

`SEARCH` rather than `SCAN`, and a covering index, so the table is never read. That is the change that turns a query scaling with
the table into one scaling with the answer.

If the query genuinely is `where kind = 'purchase'` alone and it runs constantly, the honest options are a partial index on the
value, which is a small index for the rows that matter:

```sql
create index idx_event_purchase on event(at) where kind = 'purchase';
```

Partial indexes work in SQLite and PostgreSQL, and they are the right tool for a query filtered on a value that is a small
fraction of the table. They cost almost nothing to maintain because they hold few rows.

## The two mistakes

**Adding an index without measuring.** An index is not free, it costs space and it slows every write, and the case where it does
not help is common enough that the previous lesson is a whole page. Measure the query, add the index, measure again. If the
number did not move, drop it.

**Optimising the wrong query.** A slow page is often slow because of the number of queries it sends rather than any one of them,
which is the N+1 problem: a loop that runs a query per row. Fifty queries at 1 ms is 50 ms and no index fixes it. The fix is one
query with a join or an `IN`, and the plan you need to look at is the application's, not the database's.

The third mistake worth naming is optimising a query that does not matter. A report nobody runs is not a problem, and an index
added for it is a cost paid on every write of the table. Chapter ten's migration lesson is where the change goes, and it is worth
asking who runs the report before adding anything.

## Writing the query so it can be optimised

The readable version and the fast version are usually the same, with three habits that keep them aligned:

- **Compare the column, not a function of it.** `kind = 'purchase'` searches and `upper(kind) = 'PURCHASE'` scans.
- **Keep a range as a range.** `at >= '2026-06-01' and at < '2026-07-01'` searches and `substr(at, 1, 7) = '2026-06'` scans.
- **Filter on rows before grouping them.** A condition in `WHERE` removes rows before the aggregate runs and the same condition in
  `HAVING` runs after.

None of those makes a query longer or harder to read. They are habits rather than optimisations, and they are the reason a query I
write at first drafts into a plan an index can serve.

## Check yourself

Take a query that returns more than a thousand rows and time it, then read its plan. Run `analyze` and read the plan again. Add
one index that matches the filter and compare both the plan and the time, and drop the index if nothing changed. Finish by writing
down which of the two mistakes from this page you were closest to making.
