---
title: Keys and relationships
summary: Primary keys, foreign keys, and the three shapes every schema is built from.
chapter: Joining tables
minutes: 12
status: draft
---

## A primary key identifies a row

Every table in the library schema has one: `book.id`, `author.id`, `member.id`, `loan.id`. It is a value the engine keeps
unique and, in these tables, an integer that the engine assigns. Rows are referred to by that number rather than by a title,
because a title is not unique and can change.

A primary key is also the thing an index is built on, which is why a lookup by `id` is the fastest query on a table. Chapter
eight is where that matters.

## A foreign key is a reference

```sql
pragma foreign_key_list(book);
```

```text
id  seq  table     from     to  on_update  on_delete  match
--  ---  ------  ---------  --  ---------  ---------  -----
 0    0  author  author_id  id  NO ACTION  NO ACTION  NONE
```

That says `book.author_id` refers to `author.id`. Read the columns as: which foreign key constraint, its position in a
multi-column key, the table it points at, the local column, the remote column, and what happens on an update or a delete.

```sql
pragma foreign_key_list(loan);
```

```text
id  seq  table     from     id  on_update  on_delete  match
--  ---  ------  ---------  --  ---------  ---------  -----
 0    0  member  member_id  id  NO ACTION  NO ACTION  NONE
 1    0  book    book_id    id  NO ACTION  NO ACTION  NONE
```

A loan has two references, one to the member who borrowed it and one to the book. `pragma` is the query to run when a schema
has to be understood rather than trusted, and `on_delete` is the setting that decides what happens to the loan rows when a
book is deleted, which chapter seven covers.

## One-to-many

```text
author 1 ---- n book
```

An author has many books and a book has one author, so the foreign key lives on the many side: `book.author_id`. That is the
rule for the whole of this: **the foreign key goes on the side that can have only one**. Putting it on the author instead would
mean a column holding a list, which is what a relational database refuses to have.

The direction also decides what an optional relationship looks like. A book by an unknown author has `author_id` `NULL`, and a
book that must have an author has the column `NOT NULL`. The same schema question, answered in the column definition.

## Many-to-many

A book can have more than one author and an author writes more than one book, and neither side can hold the other's key. The
relationship becomes a table of its own:

```text
book 1 ---- n book_author n ---- 1 author
```

```sql
create table book_author(
  book_id integer not null references book(id),
  author_id integer not null references author(id),
  role text not null default 'author',
  primary key (book_id, author_id, role)
) strict;
```

The primary key is the pair of foreign keys rather than a new id, which is what stops the same relationship being recorded
twice. Because it is a real table, it can carry its own columns, and `role` is the one this schema needs: Borges is both the
author and the translator of Ficciones, and Le Guin wrote the introduction to a book by Shelley.

That third column is the reason a join table is not a compromise. The relationship between a book and a person has attributes
of its own, and a table is where attributes live.

```sql
select b.title, a.name, ba.role
from book_author as ba
join book as b on b.id = ba.book_id
join author as a on a.id = ba.author_id
order by b.title, ba.role;
```

```text
         title                  name             role
-------------------------  -----------------  ------------
A Wizard of Earthsea       Ursula K. Le Guin  author
Always Coming Home         Ursula K. Le Guin  author
Ficciones                  Jorge Luis Borges  author
Ficciones                  Jorge Luis Borges  translator
Frankenstein               Mary Shelley       author
Frankenstein               Ursula K. Le Guin  introduction
Kindred                    Octavia E. Butler  author
Parable of the Sower       Octavia E. Butler  author
The Dispossessed           Ursula K. Le Guin  author
The Left Hand of Darkness  Ursula K. Le Guin  author
```

Ten rows for eight books, because two books have two people attached. A query that forgot the `role` column would report eight
books and a count of people rather than of authorships, which is the kind of bug that a join table with meaningful keys
prevents.

## The unusual case: a relationship to itself

```sql
create table category(
  id integer primary key,
  name text not null,
  parent_id integer references category(id)
) strict;
```

A category can have a parent category, which is a foreign key pointing at the same table. That is a self-reference and it
models a tree, and the query that walks it is a self-join, which the page after the next one covers. It is also the shape a
recursive query needs in chapter nine.

## Three shapes are enough

Every schema here is made of these:

| Shape | Foreign key lives | Example |
| --- | --- | --- |
| one-to-many | on the many side | `book.author_id` |
| many-to-many | in a join table | `book_author` |
| one-to-one | on either side, plus `UNIQUE` | `member.address_id` |
| a tree | pointing at the same table | `category.parent_id` |

A one-to-one is a one-to-many with a `UNIQUE` constraint on the foreign key, which is worth knowing because the two are the
same mechanism and only the constraint differs. It is also usually a sign that the two tables should be one, which
normalisation in chapter seven has an opinion about.

## Check yourself

Run `pragma foreign_key_list` on every table and write down the relationships in words. Add a `category` table with a
`parent_id` and enough rows for two levels of nesting. Then add one book with two authors through the join table and one
authorship with a role other than `author`, and count how many rows the three-table join returns for it.
