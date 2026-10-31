---
title: Creating tables
summary: Column types in two engines, STRICT, generated columns, and the table made from a query.
chapter: Designing a schema
minutes: 12
status: draft
---

## The shape of a CREATE TABLE

```sql
create table item(
  id integer primary key,
  price_pence integer not null,
  quantity integer not null default 1,
  total_pence integer generated always as (price_pence * quantity) stored,
  label text generated always as (price_pence || 'p x ' || quantity) virtual
) strict;

insert into item(id, price_pence, quantity) values (1, 500, 3);

select id, price_pence, quantity, total_pence, label from item;
```

```text
id  price_pence  quantity  total_pence   label
--  -----------  --------  -----------  --------
 1          500         3         1500  500p x 3
```

A column is a name, a type, a set of constraints and a default. The `total_pence` and `label` columns are **generated**: they
are computed from the other columns rather than stored by the writer, so they cannot disagree with the rows they came from.

`stored` keeps the value on disk and `virtual` computes it on read. The trade is the usual one: stored costs space and is fast to
read but has to be rewritten when either input changes; virtual costs nothing to write and the arithmetic on every read. A
generated column is not part of an `INSERT` and supplying a value for it is an error.

## Types per engine

| SQLite | PostgreSQL |
| --- | --- |
| `integer`, `real`, `text`, `blob` | `integer`, `bigint`, `numeric`, `real`, `double precision` |
| no boolean | `boolean` |
| no date | `date`, `timestamp`, `timestamptz` |
| no uuid type | `uuid`, with `gen_random_uuid()` |
| `text` of any length | `text`, `varchar(n)`, `char(n)` |

SQLite's five storage classes were the first chapter's subject, and the type you write next to a column is an affinity. In
PostgreSQL the type is enforced, and choosing between `varchar(50)` and `text` is a real decision: `varchar(n)` enforces a length
and `text` does not, and in PostgreSQL there is no performance difference between them. I write `text` with a `CHECK` on the
length where a limit is needed, because a `varchar` limit is a number that a migration has to change.

A `STRICT` table is the right default for a new SQLite table. Without it, the column type is a hint and an integer column can hold
text, which the types lesson demonstrated.

## The table built from a query

```sql
create table summary as select author_id, count(*) as books from book group by author_id;

select * from summary order by books desc limit 3;
```

```text
author_id  books
---------  -----
        1      4
        2      2
        3      1
```

`CREATE TABLE ... AS SELECT` builds a table from a query's result. The columns take their names and types from the result, no
constraints are carried over, and the primary key of the source is gone. It is the statement for materialising a report, for a
temporary copy before a risky migration and for a backup of a single table.

The absence of constraints is the trap. The new table has the shape of the query and none of the guarantees of the original, so a
materialised summary is a snapshot rather than a table anybody should write to. Where the copy has to keep the constraints, the
version to use is an explicit `CREATE TABLE` with the same definition followed by an `INSERT ... SELECT`.

## Temp tables

```sql
create temp table scratch(v text);
insert into scratch values ('temp');

select * from scratch;
```

```text
 v
----
temp
```

A `TEMP` table exists for the connection and disappears when it closes. It is not in the main file, it cannot be seen by another
connection and it needs no cleanup. That makes it the right place for a staging table inside a program, and the wrong place for
anything another process needs, because a temporary table is invisible to one.

`create temp table x as select ...` and a common table expression are the two ways to hold an intermediate result. A CTE lasts for
one statement, a temp table lasts for the session, and the difference decides which one to use: a result used twice in one query
is a CTE and a result reused across statements is a temp table.

## WITHOUT ROWID

```sql
create table without_rowid(id text primary key, v text) strict, without rowid;
insert into without_rowid values ('k', 'v');
```

Every normal SQLite table has an implicit `rowid` and the primary key is an index over it. `WITHOUT ROWID` makes the primary key
the table's storage, so the rows are stored in key order and a lookup by key is one tree search rather than two. For a table with
a text key and no other index, it is smaller and faster, and it is the right choice for a lookup table.

The costs are that there is no `rowid`, so `last_insert_rowid()` is meaningless and the implicit key is gone, and that a table
with a large or non-unique key is worse off. I use it for small lookup tables with a text natural key and leave everything else
alone.

## IF NOT EXISTS and the migration question

```sql
create table if not exists category(/* ... */);
drop table if exists scratch;
```

`IF NOT EXISTS` makes a `CREATE` idempotent, which is what a script that runs at every startup needs. It also hides a mistake: a
table with the wrong shape and the same name is silently kept. The better pattern for a schema is an explicit migration file that
runs once and records that it ran, which chapter ten covers, and `IF NOT EXISTS` is for a bootstrap where the whole schema is
created from one file.

## Check yourself

Create a table with a primary key, a `NOT NULL` column with a default and two generated columns, one stored and one virtual, and
insert a row that omits them. Then build a table from a query and inspect what constraints it kept. Finish by creating a temp
table, adding and dropping a column, and explaining which of those operations SQLite supports.
