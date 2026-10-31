---
title: Inner joins
summary: Two tables on one row, the join that multiplies, and the condition that got left out.
chapter: Joining tables
minutes: 13
status: draft
---

## The join that says what it means

```sql
select b.title, a.name as author_name
from book as b
inner join author as a on a.id = b.author_id
order by b.title limit 4;
```

```text
       title             author_name
--------------------  -----------------
A Wizard of Earthsea  Ursula K. Le Guin
Always Coming Home    Ursula K. Le Guin
Ficciones             Jorge Luis Borges
Frankenstein          Mary Shelley
```

`inner join` pairs rows where the `ON` condition is true, and only those pairs appear. `INNER` is optional: `join` on its own
is an inner join, which is why the word is often left out.

The aliases `b` and `a` are what make the query readable and, more importantly, unambiguous. Two tables in a join can have a
column with the same name, and an unqualified `id` in a query that mentions both is an error rather than a guess.

## A comma and a WHERE is the same thing

```sql
select b.title, a.name
from book as b, author as a
where b.author_id = a.id
order by b.title limit 2;
```

```text
       title                name
--------------------  -----------------
A Wizard of Earthsea  Ursula K. Le Guin
Always Coming Home    Ursula K. Le Guin
```

That is the older spelling, and it produces the same plan and the same rows. `JOIN ... ON` is the version to write, for two
reasons: the condition sits next to the table it belongs to, and the join cannot be silently turned into a cross product by a
missing `WHERE`.

## The missing condition

```sql
select count(*) as rows_from_comma_join from book, author;
```

```text
rows_from_comma_join
--------------------
                  32
```

Eight books times four authors is 32 rows: a join with no condition pairs every row with every row. That is a cross join, and
it is occasionally what you want and usually a mistake. On a real table with a million rows on each side it is the query that
takes the database down.

The comma spelling makes it easy to write by accident, because forgetting the `WHERE` is a syntactically valid query that
returns a plausible-looking number of rows. That is the strongest argument for `JOIN ... ON`: the condition is part of the
statement rather than a clause that can go missing.

## USING is for the column with the same name on both sides

```sql
select b.title, a.name
from book as b
join author as a using (id) limit 2;
```

```text
         title                  name
-------------------------  -----------------
The Left Hand of Darkness  Ursula K. Le Guin
A Wizard of Earthsea       Octavia E. Butler
```

That query is wrong. `USING (id)` joined `book.id` to `author.id`, so the second row pairs a book with whichever author
happens to have the same number, and every row is nonsense. It runs, returns rows, and looks like a working join, which is
exactly why `USING` is worth avoiding.

`USING (col)` requires the column to have the same name in both tables, and it is only correct when that name means the same
thing on both sides: a `book_author` joined to a `book` on `using (book_id)` where the join table's column is called `book_id`
in one and `id` in the other will not compile, which is the good case. Where both sides have an `id`, `ON b.id = a.book_id` says
which column of which table, and it is the version I write.

## Joining three tables

```sql
select b.title, a.name, ba.role
from book_author as ba
join book as b on b.id = ba.book_id
join author as a on a.id = ba.author_id
order by b.title, ba.role;
```

The join table sits in the middle and is joined to both sides. The order of the `join` clauses does not change the result: the
planner chooses an order to execute in, and a query written with the tables in a different order gives the same rows. What it
does change is what a reader understands, so the order in the text follows the relationship.

## A join can multiply rows

Ten rows came back for eight books in that last query, because Ficciones has two people attached and Frankenstein has two as
well. That is not a bug: the question "book with each of its people" has ten answers.

It becomes a bug the moment an aggregate is involved:

```sql
select count(*) as rows, count(distinct b.id) as books from book as b join book_author as ba on ba.book_id = b.id;
```

```text
rows   books
-----  -------
    10       8
```

A `count(*)` over a join counts combined rows, and the number of books needs `count(distinct b.id)`. The same mistake in a sum
is worse, because summing a book's price once per author inflates the total without any sign that it happened. When a sum over
a joined query looks too large, this is the first thing to check.

## The join is only as good as the key

An inner join silently drops rows that have no match. A book whose `author_id` points at an author that is not there
disappears from the result, and if the foreign key is not enforced, nothing else notices:

```sql
pragma foreign_keys;
```

```text
foreign_keys
------------
           0
```

Foreign keys are **off by default in SQLite**, which means the engine will not stop a program writing an `author_id` that
does not exist, and the join above loses the row without a word. PostgreSQL enforces them always. The next lesson covers outer
joins, which are how those missing rows are found rather than lost, and chapter seven covers turning SQLite's enforcement on.

## Check yourself

Join books to authors with `JOIN ... ON` and again with a comma and a `WHERE`, and confirm the rows agree. Run a join with no
condition and explain the row count. Join the three tables through `book_author` and count both the rows and the distinct
books. Finish by running the query with `USING (id)` and explaining why its rows are wrong.
