---
title: The schema review checklist
summary: The queries that find the missing index, the three design questions, and what to read before approving.
chapter: Where to go next
minutes: 12
status: draft
---

## The mechanical checks

These are queries rather than opinions, and they run against `sqlite_master` and the `pragma` table-valued functions. They are the
first thing I run on a schema I did not write.

**Every table should have a primary key.**

```sql
select m.name as table_without_pk
from sqlite_master as m
where m.type = 'table' and m.name not like 'sqlite_%'
  and not exists (select 1 from pragma_table_info(m.name) as c where c.pk > 0);
```

On the library schema this returns nothing, which is the answer you want.

**Every foreign key should have an index leading with it.**

```sql
select fk.table_name as child_table, fk."from" as fk_column,
       (select count(*) from pragma_index_list(fk.table_name) as i
        join pragma_index_info(i.name) as ic on 1 = 1
        where ic.name = fk."from") as index_leading_with_it
from (select m.name as table_name, p."from", p."table" from sqlite_master as m
      join pragma_foreign_key_list(m.name) as p where m.type = 'table') as fk
order by fk.table_name, fk."from";
```

```text
child_table  fk_column  index_leading_with_it
-----------  ---------  ---------------------
book         author_id                      0
book_author  author_id                      1
book_author  book_id                        1
category     parent_id                      0
loan         book_id                        0
loan         member_id                      0
```

Four zeros means four foreign keys whose parent deletes will scan the child table, which is the missing-index rule from the schema
chapter found in one query. The two ones are `book_author`, whose composite primary key covers both.

**There should be no orphans.**

```sql
select count(*) as orphans from loan where book_id not in (select id from book);
```

Zero is the answer, and a non-zero count is a run of data corruption in a database whose foreign keys were not enforced. In
PostgreSQL the same questions are one query against `pg_constraint` and `pg_index`, and a schema-diff tool does the job by
comparing two schemas rather than one.

## The three design questions

The mechanical checks find a missing index. These three find a design mistake, and no query answers them.

**1. Is every fact stored once?**

The question from the normalisation chapter, asked per column: what is this column a fact about? A column that is a fact about
another table's row belongs in that table, and the cost of not moving it is the update anomaly the unnormalised table
demonstrated.

**2. Is every rule the description states expressed as a constraint?**

Take the requirements document and mark each rule as row-level or cross-row. The row-level ones become `CHECK`, `NOT NULL` and
`UNIQUE`. The cross-row ones are the list of things that will go wrong, and the booking system's capacity is the example: it was
described as a limit, written as a `CHECK` on the capacity column, and the seats sold went past it.

**3. Is every column's type honest about what it holds?**

| Smell | Should be |
| --- | --- |
| a price or a balance in a `REAL` | an integer of pence, or `numeric` |
| a date in a `TEXT` column with no check | an ISO format, with a `CHECK` on the pattern |
| a boolean in a `TEXT` column | an integer 0 or 1, or `boolean` |
| a status in a free `TEXT` column | a `CHECK` on the allowed values |
| a comma-separated list in a column | a join table |
| an unused prefix or suffix inside a value | a column |
| a column named `data`, `value` or `info` | whatever it actually holds |

The last two rows indicate a schema written by somebody avoiding a decision.

## The index checks

- **The foreign key columns**, from the query above.
- **The columns in the `WHERE` of the queries the application runs**, which means reading the slow query log or the code rather
  than guessing.
- **The columns in every `ORDER BY` with a `LIMIT`**, since a pagination query without an index sorts the whole table.
- **The indexes nobody uses.** An index that no plan names is a write cost with no read benefit, and dropping it is the easiest win
  in most schemas.
- **The duplicate indexes.** An index on `(a)` and one on `(a, b)` means the first is redundant.

## The operational checks

- **Is the schema in a migration file?** A schema that exists only in a development database is one nobody else can create.
- **Are the foreign keys enforced?** In SQLite that is `pragma foreign_keys = on` in every connection, plus a test that expects an
  error when it is missing.
- **Are the permissions right for the roles?** An application user with `DROP TABLE` is one injection away from a restore.
- **Is there a backup, and has a restore been tested?** A restore test is the only evidence.
- **Do the application's queries have plans that scale?** A schema review without the queries is half a review.

## What to write in a review

A review comment is most useful when it names the consequence rather than the preference:

| Instead of | Write |
| --- | --- |
| "this should be normalised" | "the author's name is stored per book, so an author rename has to update every book row and one will be missed" |
| "add an index" | "this foreign key has no index, so deleting a parent scans the child table" |
| "use an integer for money" | "a `REAL` price cannot represent 19.99 exactly, so a sum of line items is off by a fraction of a penny" |
| "this should be a check constraint" | "the status column accepts any string, so a typo becomes a state the application cannot handle" |

The preference and the consequence differ in whether the other person can disagree. `Normalise it` is an opinion; "one author
rename will leave a stale name in a row and nothing will report it" is a bug report.

## Check yourself

Run the mechanical queries against a schema you have access to and write down every result that is not what it should be. Then take
the three design questions and answer them for one table, naming one thing to change. Finish by writing your findings as
consequences rather than preferences.
