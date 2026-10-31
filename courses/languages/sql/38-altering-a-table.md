---
title: Altering a table
summary: What SQLite can change in place, what it cannot, and the copy that changes anything.
chapter: Designing a schema
minutes: 12
status: draft
---

## What ALTER TABLE can do

```sql
alter table scratch add column extra text default 'added';

select * from scratch;
```

```text
 v    extra
----  -----
temp  added
```

The existing row got the default, which is why a new `NOT NULL` column needs one: without a default there is nothing to put in the
existing rows and the statement is refused. That rule catches people adding a required column to a table with rows in it, and the
fix is to add it nullable, backfill, then add the constraint in a second step.

```sql
alter table scratch rename to scratch2;
alter table scratch2 rename column v to value;
alter table scratch2 drop column extra;
pragma table_info(scratch2);
```

```text
cid  name   type  notnull  dflt_value  pk
---  -----  ----  -------  ----------  --
  0  value  TEXT        0               0
```

Renaming a table, renaming a column and dropping a column all work in current SQLite. Dropping arrived in 3.35 and has a caveat:
it rewrites the table and it refuses if the column is indexed, part of the primary key, or referenced by a view, trigger or
generated column. Those refusals are the engine being honest about what it cannot do safely.

## What ALTER TABLE cannot do

```sql
alter table scratch2 alter column value text not null;
```

```text
Parse error near line 111: near "text": syntax error
```

SQLite has no `ALTER COLUMN`. Changing a column's type, adding a constraint to it, removing `NOT NULL`, changing a default or
adding a check to an existing column are all outside what it can do in place. PostgreSQL supports several of those, and its
`ALTER COLUMN ... TYPE` rewrites the table unless the change is one it can do as metadata.

The three things to remember about an alteration of any kind:

1. **It is a schema change, and it runs in a transaction** where the engine supports transactional DDL. SQLite and PostgreSQL both
   do, so a failed migration leaves the schema as it was. MySQL does not, which is why a MySQL migration is a different discipline.
2. **It takes a lock.** An `ALTER TABLE` on a busy table blocks writers, and the rewrite part blocks for as long as it takes to
   copy every row.
3. **It is not reversible.** There is no `ALTER TABLE ... UNDO`, and the reverse statement is not always the one you would guess:
   renaming a column back restores the name and not the data.

## The recreate-and-copy that changes anything

```sql
pragma foreign_keys = off;
begin;

create table widget_new(
  id integer primary key,
  name text not null,
  price_pence integer not null
) strict;

insert into widget_new(id, name, price_pence)
select id, name, cast(round(cast(price as real) * 100) as integer) from widget;

drop table widget;
alter table widget_new rename to widget;

commit;
pragma foreign_keys = on;
```

```text
id  name  price_pence
--  ----  -----------
 1  one          1050
 2  two          2025
```

That took a `price` column holding text such as `'10.50'` and replaced it with an integer number of pence, converting the values on
the way through. No `ALTER COLUMN` can do that and this can, which is why the pattern is in every SQLite migration guide. The steps
in order:

1. **Turn foreign keys off**, because the `DROP` and the `RENAME` in the middle would otherwise be refused or would cascade.
2. **Begin a transaction**, so a failure partway leaves the original table in place.
3. **Create the new table** with the shape you want.
4. **Copy the rows** with a `SELECT` that does every transformation.
5. **Drop the old table and rename the new one**, which is what makes the change invisible to everything that follows.
6. **Recreate the indexes, triggers and views** the old table had. They are gone with it, and this is the step that gets forgotten.
7. **Commit, and turn foreign keys back on.**
8. **Run `pragma foreign_key_check`** if any other table referenced this one, because nothing checked during the copy.

Two details are easy to miss: `foreign_keys` is a no-op inside a transaction, so it has to be set before the `BEGIN`, and the final
`foreign_key_check` is the only validation the copy gets.

## The schema after the rename

```sql
select sql from sqlite_master where name = 'widget';
```

```text
             sql
------------------------------
CREATE TABLE "widget"(
  id integer primary key,
  name text not null,
  price_pence integer not null
) strict
```

The table's stored definition is the one written for `widget_new`, so the copied table is as clean as if it had been created with
that shape. Nothing is left over, which is the reason to prefer this pattern over patching a table in place.

## The migration question

Every step above is a statement a migration tool would run, and the tool's job is to run them once, in order, and record that it
did. Chapter ten covers the tooling and this lesson is the content of the file it runs. Two rules from practice:

- **Never edit a migration that has already run somewhere.** Add a new one. A migration applied on one machine and then edited is
  a schema that differs between machines with no record of why.
- **Test the migration on a copy of production data.** An `ALTER` that takes a second on a thousand rows can take an hour on a
  hundred million, and the transaction that wraps it holds a lock for all of it.

## Check yourself

Add a column with a default to a table with rows in it and check what the existing rows hold. Add one without a default and read the
error. Rename a column and drop another. Then take a table with a text column that should be an integer and convert it with the
recreate-and-copy, remembering to recreate its indexes and to run `pragma foreign_key_check` afterwards.
