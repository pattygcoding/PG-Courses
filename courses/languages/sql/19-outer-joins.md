---
title: Outer joins
summary: Keeping rows that have no match, and the one clause that quietly turns a LEFT JOIN back into an INNER.
chapter: Joining tables
minutes: 13
status: draft
---

## LEFT JOIN keeps the rows that do not match

```sql
select b.title, l.id as loan_id, l.loaned_on
from book as b left join loan as l on l.book_id = b.id
order by b.title, l.id;
```

```text
          title            loan_id  loaned_on
-------------------------  -------  ----------
A Wizard of Earthsea             4  2026-02-05
Always Coming Home
Ficciones                        3  2026-01-20
Frankenstein
Kindred                          2  2026-02-01
Parable of the Sower
The Dispossessed
The Left Hand of Darkness        1  2026-01-05
The Left Hand of Darkness        5  2026-02-20
```

Nine rows: the five loans, and the four books that have none with `NULL` in every column from the right table. `LEFT` is the
outer join to know, and the left table is the one whose rows are all kept.

`RIGHT JOIN` is the same thing with the tables the other way round, and `FULL OUTER JOIN` keeps unmatched rows from both
sides. SQLite has supported all three since 3.39, and this query returns the same nine rows because every loan points at a
book:

```sql
select count(*) as full_outer_rows from book as b full outer join loan as l on l.book_id = b.id;
```

```text
full_outer_rows
---------------
              9
```

The tests I write use `LEFT JOIN` almost exclusively, because a `RIGHT JOIN` can be rewritten as a `LEFT JOIN` with the table
order swapped, and only one of the two forms reads well. `FULL OUTER JOIN` is for a reconciliation: rows present in one side,
the other, or both.

## Counting through an outer join

```sql
select b.title, count(*) as rows_including_null, count(l.id) as loans
from book as b left join loan as l on l.book_id = b.id
group by b.id order by loans asc, b.title limit 3;
```

```text
       title          rows_including_null  loans
--------------------  -------------------  -----
Always Coming Home                      1      0
Frankenstein                            1      0
Parable of the Sower                    1      0
```

A book with no loan has one row, which is the `NULL` row the join produced, and `count(*)` counts it while `count(l.id)` does
not. That is the commonest outer-join bug: a report that says every book has been borrowed once because the count is over the
joined rows rather than the matched ones. Counting a column from the right table is the fix.

## Putting a condition in ON or in WHERE

```sql
select b.title, l.loaned_on
from book as b left join loan as l on l.book_id = b.id and l.loaned_on > '2026-02-01'
order by b.title limit 3;
```

```text
       title          loaned_on
--------------------  ----------
A Wizard of Earthsea  2026-02-05
Always Coming Home
Ficciones
```

```sql
select b.title from book as b left join loan as l on l.book_id = b.id where l.loaned_on > '2026-02-01';
```

```text
         title
-------------------------
A Wizard of Earthsea
The Left Hand of Darkness
```

The first returns three rows and the second two, and the reason is where the condition runs. A condition in `ON` is part of the
match: a loan that fails it is not a match, so the book is kept with `NULL`s. A condition in `WHERE` runs after the join, and a
`NULL` fails it, so the unmatched rows are removed and the outer join has become an inner one.

The rule: **a filter on the right-hand table of a `LEFT JOIN` belongs in `ON` if the left rows must survive, and in `WHERE` if
they must not.** Half of the wrong reports I have read came from this mistake, and it is invisible because the query still runs
and the count is merely smaller.

## Finding rows with no match

```sql
select b.title from book as b left join loan as l on l.book_id = b.id where l.id is null;
```

```text
       title
--------------------
The Dispossessed
Parable of the Sower
Frankenstein
Always Coming Home
```

The `IS NULL` test on a column from the right table is the anti-join: the rows the outer join padded are exactly the rows with
no match. `NOT EXISTS` from the subquery lesson is the other spelling and often the faster one, because the engine can stop at
the first match rather than building every joined row and filtering them.

## Orphans are what an outer join is really for

```sql
pragma foreign_keys;
```

```text
foreign_keys
------------
           0
```

Foreign keys are **off by default in SQLite**, so a program can write an `author_id` that points at nothing, and the inner join
from the last lesson loses the book without a word:

```sql
insert into book(id, title, author_id, pages, published, price_pence)
  values (9, 'A book with a missing author', 99, 100, '2026-01-01', 500);
```

```sql
select b.title, a.name as author_name from book as b left join author as a on a.id = b.author_id where a.id is null;
```

```text
           title              author_name
----------------------------  -----------
A book with a missing author
```

The insert succeeded and the outer join with an `IS NULL` test is the query that finds the damage, so that is the pair to keep:
a referential integrity check on a schedule, because the constraint that should have prevented the row is not enforced. On
PostgreSQL the insert is an error and the query is unnecessary, which is why SQLite's default is worth changing on a database
that matters:

```sql
pragma foreign_keys = on;
```

That setting is per connection rather than stored in the file, so every program that opens the database has to set it, and
chapter seven explains why forgetting it is such a common surprise.

## Emulating a full outer join

```sql
select a.name, b.title from author as a left join book as b on b.author_id = a.id
union
select a.name, b.title from book as b left join author as a on b.author_id = a.id where a.id is null;
```

```text
      name                    title
-----------------  ----------------------------
                   A book with a missing author
Jorge Luis Borges  Ficciones
Mary Shelley       Frankenstein
Octavia E. Butler  Kindred
Octavia E. Butler  Parable of the Sower
Ursula K. Le Guin  A Wizard of Earthsea
Ursula K. Le Guin  Always Coming Home
Ursula K. Le Guin  The Dispossessed
Ursula K. Le Guin  The Left Hand of Darkness
```

A `LEFT JOIN` unioned with the anti-join from the other direction emulates `FULL OUTER JOIN` where it is not available, which
includes SQLite before 3.39 and MySQL. The orphan book arrives with a `NULL` name because the second half of the union found
it.

## Check yourself

List every book with its loan, keeping the books with no loan, and count both the rows and the loan ids per book. Write the
same `LEFT JOIN` twice with a condition on the right table, once in `ON` and once in `WHERE`, and explain the row difference.
Then write the anti-join that finds the books that have never been borrowed, and the check that would find a book pointing at
an author that does not exist.
