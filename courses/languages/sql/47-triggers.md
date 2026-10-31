---
title: Triggers
summary: Code the database runs for you, the two that earn their place, and the loop that does not happen.
chapter: Views, CTEs and triggers
minutes: 12
status: draft
---

## A trigger fires on a change

```sql
create trigger book_update_timestamp after update on book
begin
  insert into audit(table_name, action, row_id) values ('book', 'update', old.id);
end;

update book set pages = 999 where id = 2;

select table_name, action, row_id from audit;
```

```text
table_name  action  row_id
----------  ------  ------
book        update       2
```

`after update on book` says when it fires, `old.id` is the row as it was and `new.id` is the row as it will be. `before` triggers
run before the change and can refuse it; `after` triggers run once it has happened. Both get `old` and `new`, with the obvious rule
that `old` does not exist on an insert and `new` does not exist on a delete.

A trigger body is a block of statements between `begin` and `end`, and it can insert, update, delete, `select raise(...)` to fail,
and call other triggers. It runs in the same transaction as the statement that fired it, so a failure anywhere rolls back
everything.

## The loop that does not happen

```sql
create trigger book_updated_at after update on book
begin
  update book set price_pence = price_pence where id = new.id;
end;

update book set pages = 100 where id = 3;
```

```text
id  pages  price_pence
--  -----  -----------
 3    100         1199
```

The trigger updated the table it fires on, and the statement completed without recursing. SQLite has a `recursive_triggers`
setting that is **off by default**, so a trigger's own changes do not fire triggers. Turning it on is occasionally wanted and it
is usually a mistake, because a trigger that updates its own table with the setting on is an infinite loop that the environment
reports as a failure much later.

PostgreSQL's rule differs in a way worth knowing: a trigger changing its own table fires the trigger again, and the loop stops when
a pass changes nothing. An update that sets a column from itself is where that distinction becomes a live difference between the
two engines.

## Refusing a statement

```sql
create trigger book_delete_guard before delete on book
when exists (select 1 from loan where loan.book_id = old.id)
begin
  select raise(abort, 'cannot delete a book with loans');
end;

delete from book where id = 1;
```

```text
Error near line 97: cannot delete a book with loans
```

`raise(abort, message)` fails the statement with that message, and the message reaches the client, which is what makes this usable
for a rule the application should show a user. The `when` clause is a condition on the trigger that keeps the body from running
when it is false, which is cheaper than raising and catching.

That trigger duplicates what a foreign key with `restrict` does, and the constraint is the better tool where it works. A trigger
earns its place for a rule a constraint cannot express: a date range, a combination of columns, a state machine.

## Keeping a derived value correct

```sql
create trigger loan_insert after insert on loan
begin
  update member_count set books = books + 1
  where name = (select name from member where id = new.member_id);
end;
```

A counter column that a trigger maintains is the classic use, and the honest assessment is that it moves work rather than removing
it. The trigger has to be right for every path that changes the count, which means a companion trigger for the delete and one for
the update that moves a row from one member to another. Three triggers to keep one number correct, each of which is a place the
next person will not look.

The alternatives are worth weighing every time:

- **Compute it in the query.** A `count(*)` with a `LEFT JOIN` is always right and costs a join, and on the table sizes where a
  counter seems necessary it is usually the right answer.
- **A generated column.** The engine maintains it and it cannot drift, and it works only when the value is a function of columns
  in the same row, which a count across rows is not.
- **A scheduled recomputation.** A nightly job that sets the counters from the rows, which heals a mistake rather than
  accumulating it.

A trigger for an audit row is a better use of the mechanism, because an audit row is not derived from anything.

## Consider a view with INSTEAD OF instead

An `instead of` trigger on a view is how SQLite lets a complex view be written through: the trigger body does the writes to the
base tables and the view becomes writable. It is a neat trick and it is the reason the write path can be hidden inside a schema,
which is also the reason to be careful with it. A program that inserts into a view is relying on a mapping that its SQL does not
show, and the mapping is a trigger in another file.

## Trigger limits

| | SQLite | PostgreSQL |
| --- | --- | --- |
| firing points | `before`, `after`, `instead of` | the same, plus statement-level |
| per row | always | `for each row` or once per statement |
| body | SQL statements | a function, in PL/pgSQL or any language |
| recursion | off by default | fires again |
| disable | drop and recreate | `alter table ... disable trigger` |
| reading | `sqlite_master` | `pg_trigger` |

Two gaps matter in practice. SQLite cannot disable a trigger without dropping it, which makes a bulk load that would fire it a
million times awkward. And SQLite's trigger body is a list of statements rather than a function, so a trigger cannot be called
from anywhere else or tested on its own. PostgreSQL's trigger calls a function, which means the logic can be tested as a function,
and that is why a PostgreSQL schema can carry more logic than a SQLite one without becoming unmaintainable.

## Where I use them

- **An audit row on a sensitive table.** The insert is one statement and no writer can forget it.
- **An `updated_at` timestamp.** The rule is universal and a trigger is the only place it cannot be skipped.
- **A refusal a constraint cannot express.** A state machine's legal transitions, a date ordering across two rows, a rule that
  needs a query.
- **Keeping a search column in step.** A generated column is better where the engine supports it.

And where I do not: business logic that belongs in code with tests, a counter that three triggers have to maintain, and anything
whose behaviour a reader of the application's SQL would not predict. A trigger is invisible at the call site, which is
simultaneously the reason to use one and the reason to use few.

A trigger is also the hardest thing in a schema to change, because dropping it is a change to behaviour that nothing in the
application names. That is the argument for naming it well and for keeping the list of them short enough to read: if a schema has
twenty triggers, nobody knows what an `UPDATE` does.

## Check yourself

Create an audit table and a trigger that writes to it on update, then update a row and read the audit row. Write a `before delete`
trigger that refuses a delete under a condition you choose and read the message. Then write a trigger that updates its own table
and confirm it does not loop, and find the setting that would change that.
