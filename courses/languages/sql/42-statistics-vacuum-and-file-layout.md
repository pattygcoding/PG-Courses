---
title: Statistics, vacuum and file layout
summary: What the planner knows, the space a delete leaves behind, and the command that takes it back.
chapter: Performance
minutes: 12
status: draft
---

## The statistics table

```sql
analyze;
select * from sqlite_stat1;
```

```text
  tbl  |      idx       |     stat
=======+================+==============
 event | idx_event_kind | 200000 40000
```

One row per index. `200000` is the rows in the table and `40000` is the average rows per distinct value of the index's leading
column. Five kinds over 200,000 rows is 40,000 each, which is what the planner reads before deciding whether a lookup on `kind` is
worth doing. The answer it derives is "a fifth of the table", and the decision that follows is reasonable.

`ANALYZE` walks every index and writes these numbers, so it is a background job rather than something to run per query. Run it
after a load that changed the shape of the data and after creating an index. Without it the planner assumes a uniform
distribution, which is wrong for any column that is not uniform.

A skewed column is where this matters: a `status` column that is `'done'` for 99% of rows and `'open'` for the rest. A default
estimate says a lookup returns a small fraction, the truth is that `status = 'done'` returns almost everything, and a scan would
be better. A stale statistic gives you the wrong plan with no warning.

PostgreSQL keeps the same information in `pg_statistic` and `pg_stats`, updates it in the background through autovacuum, and lets
you ask for more detail per column with `ALTER TABLE ... SET STATISTICS`. A column with a bad estimate wants a higher value there.

## The space a delete leaves

```sql
select page_count * page_size as bytes from pragma_page_count(), pragma_page_size();
```

```text
14675968
```

```sql
delete from event where kind = 'error' and id % 2 = 0;
vacuum;
select page_count * page_size as bytes_after_vacuum from pragma_page_count(), pragma_page_size();
```

```text
13242368
```

Fourteen megabytes before and thirteen after, for a delete that removed 20,000 rows. Two things are visible in those numbers:

1. **The delete freed rows, not file space.** A database file is a set of fixed-size pages, and a deleted row's page stays in the
   file until something reuses it. A database can be mostly empty space with an unchanged file size.
2. **`VACUUM` rewrites the file** and reclaims what is unused, which is why the file shrank and why it is not something to run per
   delete.

The space does get reused: the next `INSERT` fills free pages before the file grows. That is why a table that grows and shrinks
settles at the size of its largest moment, and why a one-off `VACUUM` after a big delete is worth running.

## What VACUUM does and does not do

| It does | It does not |
| --- | --- |
| rebuild the file compactly | run automatically in SQLite |
| defragment the pages | fix a bad query plan |
| rebuild the indexes | change any row's data |

`VACUUM` takes a write lock and needs disk space of about twice the database size, because it builds the new file before replacing
the old one. On a large database that is the constraint. SQLite's `auto_vacuum` mode is the alternative: it reclaims pages as rows
are deleted, at the cost of work per commit and a different file layout.

PostgreSQL's `VACUUM` is a different thing with the same name. It marks rows reusable for the next writer rather than moving data,
it runs automatically through autovacuum, and `VACUUM FULL` is the one that rewrites the table and takes an exclusive lock. A
heavily updated PostgreSQL table holds **bloat**, which is dead row versions taking space, and that is what autovacuum controls.

## Page size and layout

```sql
pragma page_size;
pragma page_count;
pragma freelist_count;
```

`page_size` is 4096 by default, `page_count` is the pages in the file and `freelist_count` is the pages on the free list. A row is
stored in a page with a header, a slot array and the row data, and a row larger than a page goes into an overflow chain. That is
why a table with a large text column reads more pages per row than one of numbers, and why a covering index is much faster: it
holds a short key rather than the whole row.

The only layout decision usually worth making is `page_size`, and only on a new database. A larger page suits large rows and a
smaller one suits small rows, and the default is a good compromise.

## Finding what takes the space

```sql
create virtual table dbstat using dbstat;
select name, sum(pgsize) as bytes from dbstat group by name order by bytes desc;
```

SQLite's `dbstat` virtual table reports the pages each table and index occupy, which is how you find out that a table is 40 MB and
its indexes are 200 MB. The answer is often an index nobody remembers creating. PostgreSQL's equivalents are `pg_relation_size`,
`pg_indexes_size` and `pg_total_relation_size`.

## Check yourself

Run `analyze` and read `sqlite_stat1` for a table with an index, and work out the average rows per value from the numbers. Delete
half the rows of a table and compare `page_count` before and after, then run `vacuum` and compare again. Finish by listing the
tables and indexes of a database by size and saying which one you would drop.
