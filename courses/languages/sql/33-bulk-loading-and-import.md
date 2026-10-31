---
title: Bulk loading and import
summary: The import command, the staging table, and the measured cost of a commit per statement.
chapter: Modifying data
minutes: 12
status: draft
---

## The measured cost of a transaction

Two thousand single-row inserts, run twice on the same file:

```text
no transaction: 5,343 ms
one transaction: 43 ms
```

Same statements, same rows, one difference: the second run wrapped them between `begin;` and `commit;`. That is **124 times
faster**, and the reason is the commit. With no transaction each statement is its own commit, and a commit is a flush to the disk
that has to finish before the next statement proceeds. Two thousand flushes take five seconds; one takes a fortieth of one.

The shape of the curve is the point, since the exact figure depends on the disk. On a solid state drive the ratio is smaller and
it is never small. A load of more than a handful of rows wants a transaction around it, and the only reason to go without is that
a partial load is more useful than none.

The two inputs differ by two lines:

```bash
sqlite3 bench.db < inserts.sql          # 2000 implicit transactions
sqlite3 bench.db < wrapped.sql          # begin; ... commit;
```

## Batches, not one statement

The transaction wraps the load and inside it the rows go in batches, because every engine limits how many values one statement
can hold:

| Engine | Limit per statement |
| --- | --- |
| SQLite | 32766 bound parameters by default |
| PostgreSQL | 65535 bound parameters |
| MySQL | 65535 placeholders, plus a packet size limit |

A thousand rows of five columns is five thousand parameters, which fits. A million rows does not, so the loop over batches is
what a loader looks like: gather 500 rows, insert them, repeat, commit once at the end. Batching exists because one statement
with 500 rows beats 500 statements, and the transaction is what makes the batch boundaries irrelevant to the final state.

## The sqlite3 import command

```text
sqlite> .mode csv
sqlite> .import books.csv book
```

`.import` reads a file and appends its rows to a table, using the current mode to parse them: `.mode csv` for a CSV, `.mode
ascii` for tab-separated. The table has to exist and its columns have to match the file's columns in order, which is the awkward
part, because a source file's columns are rarely in the order the table wants.

```text
sqlite> create table staging(book_id text, title text, author text, pages text, published text, price text);
sqlite> .mode csv
sqlite> .import dirty_books.csv staging
sqlite> select count(*) from staging;
```

That is the shape I use: import into a staging table whose columns are all text, then move the rows across with a query that
does the parsing, the cleaning and the validation. The staging table takes whatever the file has, including a column that is
meant to be a number and is not, and the second step is a `SELECT` that reports the problems before anything reaches the real
table.

```sql
insert into book(title, author_id, pages, published, price_pence)
select s.title,
       (select a.id from author as a where a.name = s.author),
       cast(nullif(s.pages, '') as integer),
       s.published,
       cast(replace(s.price, '.', '') as integer)
from staging as s
where s.title is not null and s.author is not null;
```

The subquery resolves the author by name, `nullif` turns an empty string into `NULL` before the cast from the earlier lesson, and
the `WHERE` keeps the bad rows out. Whatever is left in the staging table is the report of what did not load, which is the part of
an import a user needs to see.

## The steps of a real import

1. **Load into staging**, all columns text, no constraints. Nothing has to be valid yet.
2. **Report on the staging table.** One query per problem: rows with a missing key, a value that will not cast, a foreign key
   that does not resolve. Count them before changing anything.
3. **Move the good rows** into the real table inside one transaction, with the transformations in the select.
4. **Check the counts.** The rows in the target should equal the rows that passed the checks, and the shortfall should equal the
   rows the report counted.
5. **Keep the staging table** until the import has been checked, then drop it. An import that cannot be audited afterwards is one
   nobody can explain later.

## Validating before the insert

```sql
select count(*) as will_not_cast from staging where pages is not null and pages <> '' and cast(pages as integer) is null;
```

A cast that fails returns 0 in SQLite rather than an error, which the numbers lesson covered, so it cannot be used to validate.
PostgreSQL raises an error instead, so one bad row stops the whole import there. Both behaviours are awkward and the portable
answer is a test of the text before the cast:

```sql
select count(*) as not_a_number from staging where pages is not null and pages not glob '[0-9]*';
```

`GLOB` with `[0-9]*` is a cheap test for "starts with a digit", which catches an empty string, a word and a date where a count was
expected. It is not a complete validation and it is enough to catch what a real file has.

## Loading in another engine

PostgreSQL's `COPY` is the equivalent of `.import` and the fastest way in:

```bash
psql -c "\copy book from 'books.csv' with (format csv, header true)"
```

`\copy` reads the file on the client, which is the version that works when the server cannot see your filesystem. `COPY` is one
statement and therefore one transaction on its own, so it needs no transaction management around it, and it is the reason a load
into PostgreSQL is usually faster than the same load through a client library. MySQL's `LOAD DATA INFILE` is the same idea with a
different set of options.

## Where the time actually goes

For a load of any size the cost is in this order:

1. **Commits.** One per statement against one for the load, which the measurement above shows.
2. **Index maintenance.** Every index on the target table is updated per row, so a load into a table with four indexes is four
   index writes per row. Dropping the indexes, loading, and recreating them is a real technique for a large one-off load, at the
   cost of having no uniqueness enforced during it.
3. **Constraint checks.** A foreign key per row is a lookup per row, which is another reason the child column wants an index.
4. **Parsing.** For a text file, the conversion of every value, which is the one part that is usually cheap.

That order is the order to look in when a load is slow. The first is free to fix, the second is a decision, and the last is not
worth optimising.

## Check yourself

Time a load of a thousand rows with and without a transaction and write down both numbers. Import a CSV into a staging table,
write the query that reports the rows which will not convert, and then move the good rows into the real table in one transaction.
Finish by comparing the count in the staging table with the count that arrived, and writing down where the difference went.
