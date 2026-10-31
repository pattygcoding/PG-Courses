---
title: Joins and subqueries side by side
summary: The same question asked two ways, the rows that differ, and the plan that decides which to keep.
chapter: Joining tables
minutes: 13
status: draft
---

## The same question, twice

```sql
select b.title from book as b join book_author as ba on ba.book_id = b.id order by b.title;
```

```text
         title
-------------------------
A Wizard of Earthsea
Always Coming Home
Ficciones
Ficciones
Frankenstein
Frankenstein
Kindred
Parable of the Sower
The Dispossessed
The Left Hand of Darkness
```

```sql
select b.title from book as b where b.id in (select ba.book_id from book_author as ba) order by b.title;
```

```text
         title
-------------------------
A Wizard of Earthsea
Always Coming Home
Ficciones
Frankenstein
Kindred
Parable of the Sower
The Dispossessed
The Left Hand of Darkness
```

Ten rows against eight, for the same eight books. The join produces one row per combination, so a book with two people attached
appears twice, while `IN` asks whether the book has any match and answers once. That is the semi-join, and the two are not
interchangeable even though the sets of titles look similar.

Which is right depends on the question. "Every book with each of its people" is the join. "Every book that has at least one
person" is the semi-join. The bug version is the join with an unintended `count(*)`, which is the one the inner-join lesson
warned about.

```sql
select distinct b.title from book as b join book_author as ba on ba.book_id = b.id order by b.title;
```

`DISTINCT` makes the join return eight rows too, and it also hides the fact that the join produced ten. Where the multiplication
is not wanted, `IN` or `EXISTS` says so and does not need a `DISTINCT` to repair it.

## The semi-join and the anti-join

| Question | Join | Subquery |
| --- | --- | --- |
| has a match | `join` plus `distinct` | `where id in (...)` or `exists (...)` |
| has no match | `left join ... where x is null` | `where not exists (...)` |
| with each match | `join` | not expressible |

The subquery forms are the ones I write for the first two rows: they say what is being asked, they cannot multiply rows, and
they do not need a `GROUP BY` or a `DISTINCT` to undo something the join did.

## What the planner does with each

```sql
explain query plan select b.title from book as b where exists (select 1 from book_author as ba where ba.book_id = b.id);
```

```text
QUERY PLAN
|--SCAN b
`--SEARCH ba EXISTS USING COVERING INDEX sqlite_autoindex_book_author_1 (book_id=?)
```

```sql
explain query plan select b.title from book as b where b.id in (select ba.book_id from book_author as ba);
```

```text
QUERY PLAN
|--SEARCH b USING INTEGER PRIMARY KEY (rowid=?)
`--LIST SUBQUERY 1
   `--SCAN ba
```

Read one line at a time: `SCAN b` means the books table is read in full, and `SEARCH ba ... USING COVERING INDEX` means a lookup
in the join table by `book_id` using an index that already contains the column. A `COVERING INDEX` is one that has everything
the query needs, so the table itself is never read, and chapter eight is where that matters.

The two plans differ in where the loop is. `EXISTS` reads each book and looks up its authorships, which suits a small set of
books. `IN` builds the list of ids from the join table and looks each one up in `book`, which suits a small set of ids. Both
are fast here because both sides are tiny, and either becomes a scan of everything when an index is missing:

```sql
explain query plan select b.title from book as b where not exists (select 1 from book_author as ba where ba.book_id = b.id);
```

```text
QUERY PLAN
|--SCAN b
`--CORRELATED SCALAR SUBQUERY 1
   `--SEARCH ba USING COVERING INDEX sqlite_autoindex_book_author_1 (book_id=?)
```

`CORRELATED SCALAR SUBQUERY` is the anti-join as SQLite plans it: for each book, a lookup that finds nothing. That is a good
plan, and it is why `NOT EXISTS` is my default for "has no match".

The `book_author` primary key is the composite `(book_id, author_id, role)`, and its automatic index leads with `book_id`,
which is exactly the column these subqueries look up. That is not a coincidence: a join table's primary key is usually the
index its queries need, and chapter seven covers when that stops being true.

## The rule I use

1. **A question about rows** ("with each of", "the details of") is a join.
2. **A question about existence** ("with at least one", "with none") is `EXISTS` or `NOT EXISTS`.
3. **A question about a set of values** ("one of these ids") is `IN`.
4. **An aggregate per group** is a join with a `GROUP BY`, or a correlated subquery when the aggregate is one of several
   columns and the query would otherwise need two groupings.

The fourth case is the one with a real choice, and chapter five's window functions are the third way to answer it.

## Check yourself

Write the query for "every book with at least one person attached" as a join with `distinct`, as `IN`, and as `EXISTS`, and
confirm all three return eight rows. Then write "every book with nobody attached" as a `LEFT JOIN` with `IS NULL` and as
`NOT EXISTS`. Finish by running `explain query plan` on the two anti-joins and reading the two plans out loud.
