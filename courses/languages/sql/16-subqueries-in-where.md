---
title: Subqueries in WHERE
summary: IN, EXISTS and a scalar in a parenthesis, and the NOT IN that returns nothing.
chapter: Querying one table
minutes: 13
status: draft
---

## A subquery is a query in a parenthesis

```sql
select author_id, title from book where author_id in (select id from author where born < '1900-01-01');
```

```text
author_id     title
---------  ------------
        3  Ficciones
        4  Frankenstein
```

The inner query runs first and produces a set of ids; the outer query keeps the rows whose author is in it. Any `SELECT` is
allowed inside, and a subquery in `WHERE` sees the outer query's columns only if it is correlated, which the next section
covers.

```sql
select 1 in (select author_id from book) as author_exists, 99 in (select author_id from book) as author_missing;
```

```text
author_exists  author_missing
-------------  --------------
            1               0
```

`IN` against a subquery is the semi-join: it asks whether the value is in the set. `NOT IN` is its negation and it has the
`NULL` problem from the earlier lesson, which the last section of this page shows.

## EXISTS asks a question about a row

```sql
select title from book where exists (select 1 from loan where loan.book_id = book.id and loan.returned_on is null);
```

```text
         title
-------------------------
The Left Hand of Darkness
A Wizard of Earthsea
Kindred
```

That subquery refers to `book.id` from the outer query, which makes it **correlated**: it is evaluated once per candidate row
of `book`, and it stops at the first match because `EXISTS` only asks whether there is one. The `select 1` is a convention
rather than a requirement, since the values are never used.

```sql
select title from book where not exists (select 1 from loan where loan.book_id = book.id);
```

```text
       title
--------------------
The Dispossessed
Parable of the Sower
Frankenstein
Always Coming Home
```

`NOT EXISTS` is the anti-join and it is the safe way to ask for rows with no match. Unlike `NOT IN` it cannot be broken by a
`NULL` in the inner query, because there is no set to compare against: it asks whether any row satisfies the correlation.
Where the choice is between the two, `NOT EXISTS` is the one to reach for.

## A scalar subquery is a value

```sql
select title, (select count(*) from loan where loan.book_id = book.id) as times_loaned from book where id <= 4;
```

```text
         title            times_loaned
-------------------------  ------------
The Left Hand of Darkness             2
A Wizard of Earthsea                  1
The Dispossessed                      0
Kindred                               1
```

A subquery in the `SELECT` list is a scalar subquery: one row and one column. It is correlated here and counts the loans per
book, and it returns 0 for the book with none because `count` of nothing is 0. That is the same question a `LEFT JOIN` with a
`GROUP BY` answers, and chapter four compares the two approaches.

A scalar subquery that returns no rows gives `NULL` rather than an error, which is what to remember when a value is suddenly
missing:

```sql
select title, (select returned_on from loan where loan.book_id = book.id) as a_return from book where id = 3;
```

That is `NULL` because book 3 has no loan. A subquery returning more than one row is an error in PostgreSQL, while SQLite takes
the first row and says nothing.

## A subquery as a comparison operand

```sql
select title from book where pages > (select avg(pages) from book);
```

```text
       title
--------------------
The Left Hand of Darkness
The Dispossessed
Kindred
Parable of the Sower
```

An uncorrelated scalar subquery is evaluated once, and the comparison runs against one number. That is the shape for "above
average", "more than the total" and everything else where the threshold is itself a query.

```sql
select (select count(*) from book) as books, (select count(*) from author) as authors;
```

```text
books  authors
-----  -------
    8        4
```

Two subqueries in one `SELECT` list, each independent, each evaluated once. That is a legal and readable way to put several
different aggregates on one row, and it is what a report's summary line is made of.

## ANY and ALL are not everywhere

The standard has `> ANY (subquery)` for "greater than at least one" and `> ALL` for "greater than every one", and PostgreSQL
implements both:

```text
           title
---------------------------
 The Left Hand of Darkness
 The Dispossessed
 Parable of the Sower
(3 rows)
```

```sql
select title from book where pages > any (select pages from book where author_id = 2);
```

Three books are longer than at least one of the two by that author, and the same query with `all` returns no rows because no
book is longer than both. SQLite does not support either keyword:

```text
Parse error near line 55: near "all": syntax error
```

The portable version is a comparison against an aggregate over the subquery: `> (select min(pages) ...)` for `ANY` and
`> (select max(pages) ...)` for `ALL`. That works in both engines and it is clearer, because the words "any" and "all" do not
say which aggregate they mean.

## The NOT IN trap

```sql
select author_id from book where author_id not in (select author_id from book where pages is null);
```

```text
author_id
---------
        2
        2
        3
        4
```

That returns the authors other than the one with a missing page count, because the inner query produced one non-`NULL` value
and `NOT IN` worked. Add a single `NULL` to the inner result and the same query returns nothing at all, which is the trap from
the `NULL` lesson:

```sql
select author_id from book where author_id not in (select pages from book);
```

No rows, because one of the `pages` values is `NULL` and every comparison against it is unknown. Two ways to be safe:

```sql
select author_id from book where author_id not in (select pages from book where pages is not null);
select author_id from book where not exists (select 1 from book as other where other.pages = book.author_id);
```

The first fixes the inner query; the second avoids the comparison entirely. I write `NOT EXISTS` by habit, because it cannot
be broken by a change to the inner query that I did not think about.

## Check yourself

Find the books by an author born before 1900 with an `IN` subquery, the books with an outstanding loan with `EXISTS`, and the
books never loaned with `NOT EXISTS`. Add a loan count per book with a correlated scalar subquery. Finish by writing a `NOT IN`
query whose subquery contains a `NULL` and fixing it twice.
