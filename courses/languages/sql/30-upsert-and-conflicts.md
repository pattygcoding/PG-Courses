---
title: Upsert and conflicts
summary: ON CONFLICT, the excluded row, and the unique index the whole feature depends on.
chapter: Modifying data
minutes: 12
status: draft
---

## The problem an upsert solves

A program that has a row from somewhere else wants to insert it if it is new and update it if it is not. Without an upsert that
is a read, a branch and one of two statements, with a race in the middle: two processes can both read "not there" and both
insert. The upsert is the same decision made by the engine, atomically, in one statement.

```sql
create table tag(id integer primary key, name text not null unique);
insert into tag(name) values ('a');
insert into tag(name) values ('a') on conflict do nothing;

select count(*) as tags from tag;
```

```text
tags
----
   1
```

`ON CONFLICT DO NOTHING` says that a row which would violate a constraint is skipped instead of failing the statement. `ON
CONFLICT` with no target applies to any constraint, and the count is 1 because the second insert was discarded.

Note what `DO NOTHING` costs: the second row is discarded, and the statement does not say whether it inserted anything. That
is the shape for "make sure this is there", and it is not the shape for "tell me whether the row existed".

## DO UPDATE

```sql
insert into tag(name) values ('a') on conflict(name) do update set name = excluded.name;

select count(*) as tags_after_upsert from tag;
```

```text
tags_after_upsert
-----------------
                1
```

`excluded` is the row that the `INSERT` proposed, so `excluded.name` is the value it was about to add and the `SET` decides what
the stored row becomes. That makes the upsert a three-way decision: the existing row, the proposed row, and the expression in the
`SET` that combines them.

```sql
insert into tag(id, name) values (1, 'x') on conflict(id) do update set name = 'updated ' || excluded.name;

select id, name from tag;
```

```text
id    name
--  ---------
 1  updated x
```

The stored name was `a`, the proposed one was `x`, and the `SET` concatenated them into `updated x`. The `ON CONFLICT(id)`
target names which constraint's violation triggers the update, so a table with two unique constraints can react differently to
each.

`DO NOTHING` combined with a counter is how an upsert becomes an increment, and it is worth knowing that the row is not updated
when nothing conflicts:

```sql
insert into tag(name) values ('b') on conflict(name) do update set name = excluded.name;
```

## The target has to be a unique index

`ON CONFLICT(name)` requires a unique index or a primary key on `name`, and a plain index is not enough:

```sql
create table log(id integer primary key, at text not null, kind text not null);
create index idx_log_at on log(at);
insert into log(at, kind) values ('2026-01-01', 'x') on conflict(at) do update set kind = excluded.kind;
```

```text
Parse error near line 3: ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint
```

The message names the problem exactly: `idx_log_at` is an index but not a unique one, so two rows with the same `at` are legal
and there is nothing for a conflict target to match. The fix is a unique index, which is a statement about the data rather than
about performance, and it is the reason an upsert is usually a decision about the schema as well as the statement.

## The syntax differs between engines

| Engine | Upsert |
| --- | --- |
| SQLite | `ON CONFLICT (col) DO UPDATE SET ... WHERE ...` |
| PostgreSQL | the same, plus `ON CONFLICT ON CONSTRAINT name` |
| MySQL | `ON DUPLICATE KEY UPDATE col = VALUES(col)` |

The SQLite and PostgreSQL forms are close enough to move between, with one difference that matters: both accept an optional
`WHERE` after `DO UPDATE`, and the row is updated only when it is true. That is how an upsert becomes a conditional one:

```sql
insert into tag(name) values ('a') on conflict(name) do update set name = excluded.name where tag.name <> excluded.name;
```

Without the `WHERE`, every upsert of an unchanged row still writes it, which counts as a modification, takes a lock and shows up
in a change feed. With it, an upsert of an identical row is a no-op and the count from `changes()` is 0. On a table with
triggers or logical replication, that difference is visible.

MySQL's `ON DUPLICATE KEY UPDATE` has no target column and uses `VALUES(col)` rather than `excluded.col`, and its `VALUES()`
form is deprecated in MySQL 8.0.20 in favour of an alias. The three are similar enough to be annoying and different enough that
a query is not portable.

## The statement is a write

An upsert takes a write lock even when it turns out to be a no-op, because the engine does not know that until it has looked.
On a busy table that is a real cost, and the alternative for a read-mostly path is a plain `INSERT`, a failure on conflict, and
an `UPDATE` in a second attempt. That is more code and fewer locks, and which one to write depends on how often the row is
actually new.

## Check yourself

Create a table with a unique column and insert the same value twice, once with `do nothing` and once with `do update`. Look at
the count both times. Then use `excluded` in the `SET` to combine the old and new values, and add the conditional `WHERE` so an
upsert of an unchanged row reports no change.
