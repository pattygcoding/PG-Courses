---
title: Constraints in practice
summary: The four constraints, the settings that change their behaviour, and what each one costs.
chapter: Modifying data
minutes: 13
status: draft
---

## NOT NULL and CHECK

```sql
create table member2(
  id integer primary key,
  name text not null,
  joined text not null check (joined >= '2000-01-01'),
  email text unique
) strict;

insert into member2(name, joined) values ('Ada', '1999-01-01');
```

```text
Error near line 84: CHECK constraint failed: joined >= '2000-01-01'
```

The `CHECK` is an expression that has to be true for a row to be stored, and the message quotes it, which is enough to find the
constraint. `NOT NULL` is the special case of a check for a column being empty, and it is worth writing as its own thing because
every engine and every client tool understands it.

A `CHECK` is the constraint for a business rule the database can decide:

```sql
check (due_on >= loaned_on)
check (price_pence >= 0)
check (status in ('active', 'paused', 'closed'))
```

Each is a rule that a program would otherwise enforce in one of the places it writes, and the places it forgets are the bugs the
constraint prevents. The cost is that the rule lives in two places, so changing it needs a migration.

## UNIQUE and the NULL it allows

```sql
insert into member2(name, joined, email) values ('Ada', '2026-01-01', 'ada@example.com');
insert into member2(name, joined, email) values ('Grace', '2026-01-02', 'ada@example.com');
```

```text
Error near line 86: UNIQUE constraint failed: member2.email
```

```sql
insert into member2(name, joined, email) values ('Grace', '2026-01-02', null);
insert into member2(name, joined, email) values ('Alan', '2026-01-03', null);

select id, name, email from member2;
```

```text
id  name        email
--  -----  ---------------
 1  Ada    ada@example.com
 2  Grace
 3  Alan
```

Two rows with a `NULL` email, both accepted, because a `UNIQUE` constraint treats two `NULL`s as not equal, which the `NULL`
lesson predicted. That is the standard's behaviour and every engine follows it, so a column that has to be unique and present
needs `NOT NULL` as well. A unique index is also how a table gets a natural key: `unique (book_id, member_id, loaned_on)` says a
member cannot borrow the same book twice on the same day.

## PRIMARY KEY is NOT NULL and UNIQUE

A primary key is a unique index with `NOT NULL` on every column, and it is the table's identity. The differences from a plain
`UNIQUE` constraint are that a table can have only one and that its columns are what a foreign key points at.

Creating one makes an index, and for a composite key the column order in that index is the order they are declared, which matters
for lookups that use only the first column. Chapter eight's index lesson is where that pays off.

## FOREIGN KEY and the default that is off

```sql
pragma foreign_keys = on;

insert into loan(book_id, member_id, loaned_on, due_on) values (999, 1, '2026-01-01', '2026-01-15');
```

```text
Error near line 91: FOREIGN KEY constraint failed
```

```sql
delete from book where id = 1;
```

```text
Error near line 92: FOREIGN KEY constraint failed
```

The insert was refused because book 999 does not exist, and the delete was refused because loans point at book 1. That is `NO
ACTION`, the default: the referencing rows are protected.

## The four settings for a delete

| `ON DELETE` | Effect |
| --- | --- |
| `NO ACTION` | refuse the delete while children exist (the default) |
| `RESTRICT` | the same, checked immediately rather than at the end of the statement |
| `CASCADE` | delete the children too |
| `SET NULL` | set the child's column to `NULL`, which must be nullable |
| `SET DEFAULT` | set it to the column's default |

`CASCADE` is the one to think hardest about, because it turns deleting an author into deleting their books and their books'
loans. It is right for a table whose rows have no meaning without the parent, such as `loan.book_id`, and wrong for anything a
report would want back. I write `CASCADE` for a true ownership relationship and `RESTRICT` everywhere else, so an accidental
delete fails loudly rather than quietly removing a subtree.

The setting is easy to forget, because it is per connection rather than stored in the file:

```sql
pragma foreign_keys;
```

```text
foreign_keys
------------
           0
```

Every new connection starts with enforcement off, so a program that forgets this line is not enforcing the constraints its schema
declares. The habit is one line at connection setup plus a test that inserts a bad foreign key and expects an error, which
notices the day someone removes it.

## Checking a database that was not enforced

```sql
select count(*) as orphan_loans from pragma_foreign_key_check('loan');
```

```text
orphan_loans
------------
           0
```

`pragma_foreign_key_check` returns a row per violation, so a count of 0 is a clean bill of health. It is the query to run on a
database that has been open to programs with enforcement off, and it is cheap enough to schedule. When it returns rows, the rows
are the problem: a loan pointing at a book that is gone, which an inner join would silently hide.

## Naming a constraint

```sql
constraint loan_due_after_loaned check (due_on >= loaned_on)
constraint member_email_unique unique (email)
```

A named constraint can be dropped or altered by name, and an unnamed one cannot without knowing the name the engine invented.
PostgreSQL prints `member_email_unique` in its error messages and SQLite prints the expression, so the name earns its place in
both: it turns "constraint failed" into a sentence that names the rule that was broken.

## What each constraint costs

- **A write check**, which is a comparison per row and negligible.
- **An index**, for `PRIMARY KEY` and `UNIQUE`, which costs space and slows every insert and update of those columns.
- **A lookup**, for a foreign key, which is why a child table wants an index on the foreign key column: without one, deleting a
  parent means scanning every child row to check for references.

That last point bites at scale, and chapter eight's index lesson has the plan that shows it. The general principle is that a
constraint is a promise the engine keeps, and every promise it keeps has to be checked somewhere.

## Check yourself

Create a table with all four constraints and try a row that breaks each one, reading every message. Turn foreign keys on, insert
a row that points at a missing parent, and delete a parent that has children. Finish by running `pragma_foreign_key_check` and
explaining what a non-zero count would mean.
