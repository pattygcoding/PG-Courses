---
title: Updating and deleting
summary: The statement with no undo, the WHERE that is not optional, and the count that tells you what happened.
chapter: Modifying data
minutes: 13
status: draft
---

## UPDATE changes the rows that match

```sql
update member set is_active = 0 where id = 3;

select id, is_active from member where id = 3;
```

```text
id  is_active
--  ---------
 3          0
```

`SET` names the columns and `WHERE` selects the rows, and there is no limit on either. Several columns are separated by commas,
and several rows are updated in one statement if the `WHERE` matches them:

```sql
update member set is_active = 1, joined = '2026-01-01' where id in (3, 5) returning id, is_active, joined;
```

```text
id  is_active    joined
--  ---------  ----------
 3          1  2026-01-01
 5          1  2026-01-01
```

`RETURNING` gives back the rows as they are after the update, which is the version to use when a program needs to know what
changed. Without it the only feedback is a count of rows, which is the next section.

## The WHERE clause is the whole safety story

```sql
update member set is_active = 0;
```

That statement is legal, it sets every row, and it reports success. A `DELETE` without a `WHERE` is worse, because the rows are
gone. No engine refuses these, and no engine warns: the statement is exactly what it says, and the mistake is that an
expression evaluated to something other than what the writer pictured.

The habits that prevent it:

1. **Run the `SELECT` first.** Take the `WHERE` you are about to use and run `select * from t where <same>` until the rows are
   the ones you mean. Then change `select *` to `update` or `delete` and leave the `WHERE` alone.
2. **Wrap it in a transaction and check the count before committing.** In an interactive client, `begin`, run it, `select` the
   damage, then `commit` or `rollback`. That is what a transaction is for and it costs one extra statement.
3. **Use the primary key.** An update that targets one row by id cannot be a mass update, and the id came from a `SELECT` a
   moment earlier.

The third habit is the strongest, and the count from the update is the check: the number has to match what you expected.

## The count tells you what happened

```sql
select changes() as rows_changed_by_last_statement;
```

```text
rows_changed_by_last_statement
------------------------------
                             1
```

`changes()` is SQLite's function for the number of rows the previous statement modified, and:

```sql
update member set is_active = 1 where 0;

select changes() as rows_changed_by_no_op_update;
```

```text
rows_changed_by_no_op_update
----------------------------
                           0
```

`where 0` matches nothing and the count is 0, which is how a program knows that the row it thought it was updating is not
there. An update that reports 0 is either a bug or a concurrent change, and silently treating it as success is how an
application loses an edit.

MySQL's `ROW_COUNT()`, PostgreSQL's command tag (`UPDATE 1`) and a client library's affected-rows value are the same
information in other clothes. Every engine reports it and every one of them reports it separately from the statement, because a
statement that changes nothing is not an error.

## DELETE removes the rows

```sql
delete from loan where id = 5;

select count(*) as loans_left from loan;
```

```text
loans_left
----------
         5
```

```sql
delete from loan where returned_on is not null;

select count(*) as loans_left from loan;
```

```text
loans_left
----------
         3
```

Two rows had a return date and both went. The `WHERE` here was a deliberate predicate rather than an id, which is the kind of
delete that wants the `SELECT` first: `select count(*) from loan where returned_on is not null` takes a second and answers the
question the delete is about to act on.

A row deleted from the table does not come back, and the parts of the file it occupied become free space rather than disappearing
from the disk. Chapter eight covers `VACUUM`, which is how that space is reclaimed.

## Updating a row that a foreign key points at

A delete fails or cascades depending on the foreign key's `on delete` setting, and in SQLite it does neither by default because
enforcement is off. The setting is worth deciding per relationship when the table is created, and chapter seven covers the four
options. The default in the schema this course builds is `NO ACTION`, which means the delete is refused when a child row
exists, once enforcement is on.

The alternative to a delete is a soft delete: a column such as `deleted_at` that is set instead, with every query filtering on
it. That keeps the history and costs every query a condition that will be forgotten in one place, which is a trade-off rather
than an improvement. I use a soft delete where the record has to be recoverable and a real delete where it does not.

## There is no undo, but there is a transaction

```sql
begin;
delete from loan;
select count(*) as loans_left from loan;
rollback;
select count(*) as loans_after_rollback from loan;
```

The first count is 0 and the second is the original, because the `ROLLBACK` undid the delete. That is the cheapest safety net
there is for a destructive statement, and the next lesson is about it.

## Check yourself

Update one row by id and read the count of changed rows, then update with a `WHERE` that matches nothing and read it again.
Delete rows with a predicate after running the same predicate as a `SELECT`, and check the count. Finish by wrapping a
`DELETE` with no `WHERE` in a transaction, looking at the result and rolling back.
