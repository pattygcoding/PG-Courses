---
title: Referential integrity in practice
summary: The delete that needs three tables cleared, the constraint deferred to the end, and the missing child index.
chapter: Designing a schema
minutes: 12
status: draft
---

## Deleting a parent means clearing every child

```sql
pragma foreign_keys = on;

begin;
delete from book where id = 1;
commit;
```

```text
Error near line 80: FOREIGN KEY constraint failed
```

The message names nothing, and that is the point of this page: book 1 is referenced by two loans **and** by a row in
`book_author`, and the engine refuses the delete because of one of them without saying which. The loans were moved to another
book and the delete still failed:

```sql
begin;
update loan set book_id = 2 where book_id = 1;
delete from book where id = 1;
commit;
```

```text
Error near line 84: FOREIGN KEY constraint failed

loans_for_book1  book1_still
---------------  -----------
              0            1
```

No loans point at book 1 any more, and the book is still there because of the row in `book_author`. That is the shape of a
referential integrity failure in a real schema: you fix the reference you know about, the statement still fails, and the missing
one is the table you forgot.

PostgreSQL names the constraint in its message, which is another reason to name them. SQLite's message is bare, and the remedy is
a query over the schema:

```sql
select m.name as referencing_table, p."from" as column_name
from pragma_foreign_key_list(m.name) as p
join sqlite_master as m on m.type = 'table';
```

`pragma_foreign_key_list` per table plus `sqlite_master` gives every foreign key in the database, which is how you find out what
points at a row you are trying to delete. Running it once per schema beats running it once per incident.

## Deferring the check to the end of the transaction

```sql
create table child(
  id integer primary key,
  parent_id integer references parent(id) deferrable initially deferred
) strict;

begin;
insert into child(id, parent_id) values (1, 99);
insert into parent(id, name) values (99, 'created after the child');
commit;

select c.id as child_id, p.name as parent_name from child as c join parent as p on p.id = c.parent_id;
```

```text
child_id        parent_name
--------  -----------------------
       1  created after the parent
```

The child was inserted before the parent it points at and the transaction committed, because the check ran at the `COMMIT` when
both rows existed. That is the tool for a circular reference, where two tables refer to each other and neither can be inserted
first, and for a migration that has to move rows in an order with no valid intermediate state.

The cost is real: until the transaction commits, the database is in a state where a foreign key is broken, and any statement
inside it that reads the child sees a parent that may not exist. I use `deferred` only where the alternative is impossible and
`immediate` everywhere else, so a mistake is caught at the statement that made it.

## The child table has no index

```sql
pragma index_list(loan);
```

```text
seq  name  unique  origin  partial
---  ----  ------  ------  -------
```

Nothing. The `loan` table has a primary key on `id` and no index on `book_id` or `member_id`, and `book_author` has only its
automatic primary key index. Two consequences follow:

1. **A delete of a parent scans the child table.** With enforcement on, deleting a book has to check every loan for a reference.
   Without an index on `loan.book_id`, that is a full scan of `loan` per delete.
2. **A join from the parent to the child scans too.** The query plans in the joins chapter showed `SCAN ba` for the first plan I
   looked at, which was this missing index.

```sql
create index idx_loan_book on loan(book_id);
create index idx_loan_member on loan(member_id);
```

An index on a foreign key column is not created automatically, in SQLite or in PostgreSQL, and it is the most commonly missing
index in a real schema. The rule: **every foreign key column wants an index unless another index on the same table already leads
with it.** A unique constraint on `(book_id, loaned_on)` covers `book_id` and makes a separate index unnecessary.

That is why `book_author` does not need one: its composite primary key leads with `book_id`, so the automatic index serves both
the uniqueness and the lookups. That is a happy accident of the key's column order, and it is the kind of thing the index lesson
in chapter eight teaches you to notice.

## The four delete behaviours in a real schema

| Table | `on delete` | Why |
| --- | --- | --- |
| `loan.book_id` | `cascade` | a loan without a book is meaningless |
| `loan.member_id` | `restrict` | a member with loans is a record worth keeping |
| `book_author.book_id` | `cascade` | the relationship is owned by the book |
| `book.author_id` | `restrict` | deleting an author with books should be a decision |
| `book_author.author_id` | `restrict` | the person may have written something else |
| `category.parent_id` | `set null` | a category at the top of the tree has no parent |

That table is a design document. Reading it tells you what `delete from author` would do without running it, and writing it down
is what makes the choice deliberate rather than whatever the default was.

`cascade` on one side and `restrict` on the other of the same join table looks inconsistent and it is intentional: deleting a book
should remove its authorship rows, and deleting an author should not silently remove a book from the catalogue.

## Soft deletes and the integrity question

A `deleted_at` column keeps the row and every query filters on it, which keeps every foreign key valid and costs every query a
condition. The condition is the problem: there will be a query that forgets it, or a report that counts deleted rows, and neither
is a failure the engine can catch.

The alternative is a real delete with `cascade` where ownership applies, and the rows are gone. For a catalogue, a member list or
anything a report reads, I prefer the real delete and a backup. For an audit log or anything under a legal hold, the soft delete
is not a choice.

## Check yourself

Run the parent delete twice, once without moving the child rows and once after moving them, and explain the second failure. Write
the query that lists every foreign key in the database. Then pick a table in this schema, add a foreign key, and create the index
its delete needs.
