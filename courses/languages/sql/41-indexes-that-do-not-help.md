---
title: Indexes that do not help
summary: The plan that scans anyway, the column with five values, and why OR is not the problem you were told it was.
chapter: Performance
minutes: 13
status: draft
---

## A function on the column

```sql
explain query plan select count(*) from event where upper(kind) = 'PURCHASE';
```

```text
QUERY PLAN
`--SCAN event USING COVERING INDEX idx_event_kind
```

There is an index on `kind` and this query scans. `upper(kind)` is a value the index does not hold, so the engine has to compute it
for every row, and `SCAN event USING COVERING INDEX` means it walks the whole index looking. The index is used as a smaller copy of
the table rather than as a lookup, which is a small win and not the one the index exists for.

```sql
explain query plan select count(*) from event where kind = 'purchase';
```

```text
QUERY PLAN
`--SEARCH event USING COVERING INDEX idx_event_kind (kind=?)
```

The fix is to compare the column to a value rather than comparing a function of the column: `kind = 'purchase'` searches, because
the value is the same for every row and the index knows where it is. Where the function is genuinely needed, the answer is a
function index or a collation on the index:

```sql
create index idx_event_kind_upper on event(upper(kind));
create index idx_event_kind_lower on event(kind collate nocase);
```

Both let the engine look up the computed value because the index stores it. The general rule: an index on a column is useless the
moment the query transforms that column, and the transformation has to move into the index or out of the query.

## A leading wildcard

```sql
explain query plan select count(*) from event where at like '2026-06%';
explain query plan select count(*) from event where at like '%06-15';
```

```text
`--SCAN event USING COVERING INDEX idx_event_at
`--SCAN event USING COVERING INDEX idx_event_at
```

Both scan. The second has to: a pattern beginning with `%` says nothing about where in the index to start, so the engine looks at
every entry.

The first is the case worth knowing about, because a prefix pattern contains enough information for a range lookup and SQLite did
not use it here. The optimization applies when the column has a text affinity, the pattern's prefix is a literal and
`case_sensitive_like` is off, which is the default; it did not fire in this plan, so the version that certainly works is a range
comparison:

```sql
select count(*) from event where at >= '2026-06-01' and at < '2026-07-01';
```

That is a search on the same index because it is a plain comparison, and it is the form I write for a date prefix. For a text
prefix, `glob 'prefix*'` is the other option, since `GLOB` has no case-folding requirement. Either way, a pattern query is a scan
until it can be expressed as a comparison, and the plan is where you find out which you have.

## Low selectivity

```text
200 counts of one kind, no index:   215 ms
200 counts of one kind, with index: 223 ms
```

The index made it very slightly slower. Five kinds of event over 200,000 rows means each value covers 40,000 rows, and a lookup
that returns a fifth of the table is not a lookup at all. The engine still used the index, because the query is a `count(*)` and
the index is a covering copy of the table, but the work is the same either way.

A column with few distinct values is a poor index candidate:

| Distinct values | Rows per value (200,000 rows) | Worth an index |
| --- | --- | --- |
| 2 | 100,000 | no |
| 5 | 40,000 | no |
| 365 | 548 | yes, measured at about 150 times |
| 200,000 | 1 | yes |

An index pays when a query returns a small percentage of the table. Where a column has few values and the query filters on it
constantly, the index that helps is usually composite, with a selective column second:

```sql
create index idx_event_kind_at on event(kind, at);
```

That index serves `kind = 'error' and at = '2026-06-15'` by finding the small date range inside the kind, which is a real lookup
even though `kind` alone is not selective.

## The leading column

A query on the second column of a composite index cannot use it, which the index lesson demonstrated: `where at = ...` fell back
to the single-column index. The plan is the tell, because it names the index it chose, and a plan naming a different index from
the one you added is the answer to "why is my index not used".

## OR is not the problem it used to be

The advice that an `or` in a `WHERE` prevents index use is out of date, and the plan shows why:

```text
QUERY PLAN
`--MULTI-INDEX OR
   |--INDEX 1
   |  `--SEARCH event USING INDEX idx_event_kind (kind=?)
   `--INDEX 2
      `--SEARCH event USING INDEX idx_event_at (at=?)
```

SQLite uses both indexes and merges the results, and PostgreSQL has the same optimization under the name `BitmapOr`. So
`where a = ? or b = ?` with an index on each is fine. The version worth rewriting is `or` across different tables, which becomes
a `UNION`:

```sql
select id from book where author_id = 1
union
select id from book where published < '1900-01-01';
```

A `UNION` sorts or hashes and an `or` does not always avoid that, so this is a rewrite to try when a plan shows a scan of a large
table rather than a rule to apply everywhere.

## When no index can help

Three situations where an index on the column cannot help at all:

- **A `NOT` or `<>` condition.** The matching rows are everything except a range, which is most of the table.
- **An aggregate over every row.** `sum(amount_pence)` has to read every row whatever the indexes are, unless an index covers the
  column, in which case it reads every entry instead.
- **A condition on a result.** `having count(*) > 100` runs after the grouping, so no index changes how much work the grouping is.

## Check yourself

Take a query with an index on its column, wrap the column in `upper()` and read the plan before and after. Try a prefix `LIKE` and
the equivalent range comparison and compare the plans. Then find a column with few distinct values in a table you know, work out
how many rows a filter on it returns, and decide whether it wants an index.
