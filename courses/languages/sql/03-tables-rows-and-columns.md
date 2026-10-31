---
title: Tables, rows and columns
summary: The relation, the key, and what a row with nothing in a column means.
chapter: Getting started
minutes: 12
status: draft
---

## A table is a set of rows

```sql
create table book(id integer primary key, title text not null, pages integer, published text);

insert into book(title, pages, published) values
  ('The Left Hand of Darkness', 304, '1969-03-01'),
  ('A Wizard of Earthsea', 183, '1968-11-01'),
  ('The Dispossessed', 341, '1974-01-01'),
  ('Always Coming Home', null, null);
```

```sql
select * from book;
```

```text
id            title            pages  published
--  -------------------------  -----  ----------
 1  The Left Hand of Darkness    304  1969-03-01
 2  A Wizard of Earthsea         183  1968-11-01
 3  The Dispossessed             341  1974-01-01
 4  Always Coming Home
```

Four rows and four columns, and the fourth row has nothing in two of its columns. A table is a set of rows in the
mathematical sense, which has a consequence worth stating: **a table has no inherent order**. The rows came back in the order
they were inserted because the engine happened to read them that way, and no query may rely on it. `ORDER BY` is how you ask
for an order, and chapter three covers it.

Each row is one book and each column is one fact about it. The alternative shape, one table per field, is what a spreadsheet
full of repeated data grows into and what normalisation in chapter seven is about undoing.

## `select *` is a debugging tool

```sql
select title, pages, published from book;
```

```text
         title            pages  published
-------------------------  -----  ----------
The Left Hand of Darkness    304  1969-03-01
A Wizard of Earthsea         183  1968-11-01
The Dispossessed             341  1974-01-01
Always Coming Home
```

Naming the columns is what a query should do. `select *` returns whatever the table has today, so adding a column changes
the shape of a result set that code somewhere is reading, and a wide table makes the output unreadable. The exceptions are
exploring a table you have never seen and writing a quick check, and even then the named version is usually as short.

```sql
select title as name, published as first_published from book;
```

```text
          name             first_published
-------------------------  ---------------
The Left Hand of Darkness  1969-03-01
A Wizard of Earthsea       1968-11-01
The Dispossessed           1974-01-01
Always Coming Home
```

`as` renames a column in the result. The name does not change in the table, and the alias is what the client library sees as
the field name, which is why it is worth writing when a computation or a join has produced a column with no readable name.

## A column has a type and a value

```sql
pragma table_info(book);
```

```text
cid   name       type     notnull     dflt_value  pk
---  ---------  -------  -------  ------------  --
  0  id         INTEGER        0                  1
  1  title      TEXT           1                  0
  2  pages      INTEGER        0                  0
  3  published  TEXT           0                  0
```

`not null` on `title` is a constraint the engine enforces, and the `1` in that column of `table_info` is how you read it back.
`pk` marks the primary key, which is the column that identifies a row uniquely.

A column that is not declared `not null` can hold `NULL`, and `NULL` is not the empty string, not zero and not `false`. It
means "no value was recorded", and it behaves unlike everything else in the language, which is why the next page is about it.

## The primary key

```sql
insert into book(id, title) values (2, 'A duplicate id');
```

```text
Error near line 9: UNIQUE constraint failed: book.id
```

Every table should have one, and `id integer primary key` is the SQLite idiom for an auto-assigned integer. The engine
refuses a second row with the same value, which is what makes the column an identifier rather than a number. The message
names the table and the column, which is enough to find the offending statement.

Omitting `id` from the `INSERT` list is what makes the engine choose:

```sql
insert into book(title) values ('A new book');
select id, title from book order by id;
```

```text
id            title
--  -------------------------
 1  The Left Hand of Darkness
 2  A Wizard of Earthsea
 3  The Dispossessed
 4  Always Coming Home
 5  A new book
```

The failed insert consumed nothing, and the next row took id 5. That is the property to rely on: a statement that fails
leaves the table as it was, so a script can attempt an insert and continue.

## NOT NULL is enforced too

```sql
insert into book(pages) values (100);
```

```text
Error near line 12: NOT NULL constraint failed: book.title
```

The statement named one column and the engine refused it because `title` was declared `not null` and this row has no value
for it. That is the constraint doing its job: the table cannot hold a book with no title, whatever a program tries to insert.

Chapter seven covers the full set of constraints and what each one costs. For now the useful facts are that a primary key is
a promise about uniqueness the engine keeps for you, and that a constraint violation is an error rather than a silent
adjustment.

## Numbers identify rows, names identify columns

```sql
insert into book(title) values ('A new book');
```

Naming the columns in an `INSERT` is what makes the statement survive a change to the table. A positional `insert into book
values ('A new book')` breaks the day a column is added, and it is also unreadable: nothing at the call site says which value
goes where. The named form lets the engine fill the rest, which is what the defaults are for.

The rule to take from this page: a row is identified by its key and a column by its name.

## Where the library domain starts

The examples from here build one schema:

- `book` is the table on this page.
- `author` and the join table that connects them come in chapter four, because the connection needs a key on both sides.
- `member` and `loan` come with the dates in chapter six, because a loan is a pair of dates and that chapter covers them.

The schema grows as a query needs it rather than being designed up front, and chapter twelve is where the whole thing is
reviewed as a design.

## Check yourself

Create the `book` table, insert four rows including one with `NULL` in two columns, and select every column. Then select the
columns by name and with an alias, insert a row that omits `id`, and read the error from a row that omits `title`.
