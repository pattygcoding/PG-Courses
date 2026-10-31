---
title: Views
summary: A query with a name, why it is not a table, and what happens when you write to one.
chapter: Views, CTEs and triggers
minutes: 12
status: draft
---

## A view is a stored query

```sql
create view book_summary as
select b.id, b.title, a.name as author_name, b.pages
from book as b left join author as a on a.id = b.author_id;

select title, author_name from book_summary where pages > 300 order by title;
```

```text
         title               author_name
-------------------------  -----------------
Parable of the Sower       Octavia E. Butler
The Dispossessed           Ursula K. Le Guin
The Left Hand of Darkness  Ursula K. Le Guin
```

The join is written once and used as a table from then on. A view holds no rows: it is the query, stored under a name, and every
reference to it runs that query. That is why it costs nothing to create and nothing to keep, and why a view over a slow join is a
slow query with a nicer name.

```sql
select author_name, count(*) as books from book_summary group by author_name order by books desc;
```

```text
   author_name     books
-----------------  -----
Ursula K. Le Guin      4
Octavia E. Butler      2
Mary Shelley           1
Jorge Luis Borges      1
```

A view can be grouped, joined and filtered like any table, and this is the use I get from views most often: a name for a join that
every report needs, so the join is written correctly once instead of seven times.

## A view is not a snapshot

```sql
create view long_books as select * from book where pages > 300;

select count(*) as in_view from long_books;
```

```text
in_view
-------
      3
```

```sql
insert into book(title, author_id, pages, published, price_pence) values ('New long book', 1, 500, '2026-01-01', 100);

select count(*) as in_view_after_insert from long_books;
```

```text
in_view_after_insert
--------------------
                   4
```

The view went from three rows to four without being touched, because the view is the query and the query ran again. A view is
always current, and there is nothing to refresh.

The exception is a **materialised view**, which stores the result and does have to be refreshed. PostgreSQL has them
(`create materialized view`, refreshed with `refresh materialized view`), SQLite does not, and the substitute in SQLite is a real
table filled by an `INSERT ... SELECT` and rebuilt on a schedule. The trade is the same either way: a materialised view is a
snapshot that can be stale and stale in a way nobody notices, which is the whole design question.

## Writing through a view

```sql
update updatable_view set pages = 999 where id = 2;
```

```text
Parse error near line 91: cannot modify updatable_view because it is a view
```

SQLite's views are read-only, and that is the end of the question there. PostgreSQL's simple views are updatable: a view over one
table with no aggregation has writes passed through to the base table, and `INSTEAD OF` triggers are how a more complicated one is
made writable.

Where a view is read-only, the alternatives are to write to the base table directly or to use a trigger, which is later in this
chapter. Writing to the base table is usually right: a view exists to name a query, and a program that writes through one is
relying on a hidden mapping that its SQL no longer shows.

## Finding the views

```sql
select name, type from sqlite_master where type = 'view';

.schema book_summary
```

```text
    name      type
------------  ----
book_summary  view
long_books    view
```

`sqlite_master` holds the definition, so `.schema` prints it back, and that is the fastest way to find out what a view in someone
else's schema actually is. PostgreSQL's equivalent is `pg_views` and `information_schema.views`.

## What views are good for

| Use | Why |
| --- | --- |
| naming a repeated join | the join is written correctly once |
| hiding columns | a view can expose four of a table's twelve columns |
| a stable interface | the tables move, the view keeps its shape |
| simplifying a report | a non-technical reader queries one name |
| locking down access | a user is granted the view and not the table |

The third and fifth rows are the ones with teeth. A view is the standard way to keep a schema's internals private: a program reads
`book_summary` and never learns that `book` has an `author_id`, and a user granted the view cannot read the base table. That works
because a view is a privilege boundary in PostgreSQL, and in SQLite there are no per-view permissions, so the view is a convenience
rather than a control.

## What views are bad for

- **Deep nesting.** A view over a view over a view is a plan nobody can read, and each layer hides the join that made it slow.
  Three levels is the point at which I write the query instead.
- **A view as a substitute for a fix.** A view that exists to filter out bad rows is hiding a data problem that the next query
  will hit, and the constraint that should have prevented the rows is the real fix.
- **A reporting view with business rules in it.** A rule that lives in a view is a rule that lives in a file nobody reads when the
  rule changes, and it is halfway between the schema and the application with no owner. Either the rule belongs in a constraint
  the database enforces, or in the code that has tests.

## Check yourself

Create a view that joins three tables and query it twice with different filters. Insert a row that the view's `WHERE` includes and
confirm the view shows it. Then try to update through the view and read the error, and write the equivalent update against the base
table.
