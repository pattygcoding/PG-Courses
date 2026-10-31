---
title: Ordering and limiting
summary: The only clause that guarantees an order, where NULLs land, and the tie that needs a second key.
chapter: Querying one table
minutes: 12
status: draft
---

## ORDER BY is the only guarantee

```sql
select title, pages from book order by pages;
```

```text
         title            pages
-------------------------  -----
Always Coming Home
A Wizard of Earthsea         183
Ficciones                    224
Frankenstein                 280
Kindred                      287
The Left Hand of Darkness    304
The Dispossessed             341
Parable of the Sower         345
```

Ascending is the default and `desc` reverses it. Nothing else about a query's order is defined: without `ORDER BY`, the rows
come back in whatever order the engine found them, which changes with an index, a plan, a version and the phase of the moon.
A query that needs an order has to ask for it.

## NULL sorts first ascending

The book with no page count is at the top of the ascending list, because SQLite puts `NULL` before every other value. It
sorts last in `desc`. That is a defined behaviour and an unhelpful one for a report, and the two ways to fix it are a
substitution or `NULLS LAST`:

```sql
select title, coalesce(pages, 0) as pages_or_zero from book order by pages_or_zero asc;
```

```text
         title            pages_or_zero
-------------------------  -------------
Always Coming Home                     0
A Wizard of Earthsea                 183
Ficciones                            224
Frankenstein                         280
Kindred                              287
The Left Hand of Darkness            304
The Dispossessed                     341
Parable of the Sower                 345
```

```sql
select title, pages from book order by pages nulls last, title;
```

```text
         title            pages
-------------------------  -----
A Wizard of Earthsea         183
Ficciones                    224
Frankenstein                 280
Kindred                      287
The Left Hand of Darkness    304
The Dispossessed             341
Parable of the Sower         345
Always Coming Home
```

`NULLS LAST` says what it means and works in SQLite 3.30 and later and in PostgreSQL. The `coalesce` version works everywhere
and puts the unknown row first with a zero, which reads as "zero pages" rather than "unknown", so it is the worse of the two
where `NULLS LAST` is available.

## A sort needs a tiebreaker

```sql
select author_id, title from book order by author_id, title;
```

```text
author_id            title
---------  -------------------------
        1  A Wizard of Earthsea
        1  Always Coming Home
        1  The Dispossessed
        1  The Left Hand of Darkness
        2  Kindred
        2  Parable of the Sower
        3  Ficciones
        4  Frankenstein
```

Two keys, applied left to right: the first sorts the groups and the second sorts inside each group. Without the second key the
four books by author 1 would come back in an undefined order within their group, and the query would appear to work until the
plan changed.

That is worth taking seriously because it produces a bug that is hard to believe afterwards: a `LIMIT` on a partial sort gives
a different answer on different runs, and a paginated list shows a row twice or skips one. **Any query that limits or paginates
needs a total order**, which means keys that together are unique. Here that is `author_id, title` only if a title cannot repeat,
so the honest version ends with `, id`.

```sql
select title from book order by length(title) desc, title limit 3;
```

```text
         title
-------------------------
The Left Hand of Darkness
A Wizard of Earthsea
Parable of the Sower
```

An expression is allowed in `ORDER BY`, and it is computed per row like any other. Ordering by a length is the usual
debugging order for "which value is the odd one", and it needs a second key to be reproducible for the same reason as above.

## Limit and offset

```sql
select title from book order by title limit 3;
```

```text
       title
--------------------
A Wizard of Earthsea
Always Coming Home
Ficciones
```

```sql
select title from book order by title limit 3 offset 3;
```

```text
       title
--------------------
Frankenstein
Kindred
Parable of the Sower
```

`LIMIT` takes a count and `OFFSET` skips that many rows first. Both are meaningless without an `ORDER BY`: "the first three
rows" is not a question the engine can answer otherwise.

`OFFSET` is also the pagination mechanism with a real cost, because the engine has to produce and discard the skipped rows.
Page 500 of a list reads 15000 rows to throw away. The alternatives are keyset pagination, which is `WHERE (title, id) > (?, ?)
ORDER BY title, id LIMIT 20`, and a client that does not need page 500. PostgreSQL and SQLite both support the standard
spelling `OFFSET n ROWS FETCH FIRST m ROWS ONLY` in recent versions, and `LIMIT` is shorter.

## Sorting text case-insensitively

```sql
select name from member order by name collate nocase;
```

```text
  name
---------
Ada
Alan
Grace
Katherine
```

A `COLLATE` on the sort column says which comparison to use. `NOCASE` folds ASCII case, which is what a reader expects from a
name list, and `BINARY` is the default. Chapter eleven covers collations properly, including why SQLite's `NOCASE` only
handles ASCII while PostgreSQL has locale-aware collations and a per-column choice.

## Check yourself

List the books by page count with the missing one last, twice: once with `NULLS LAST` and once with `coalesce`. Sort the books
by author and title and add a third key that makes the order total. Then take the second page of three rows and say what the
query would return if the `ORDER BY` were removed.
