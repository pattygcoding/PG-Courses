---
title: CASE, COALESCE and NULLIF
summary: Branching inside a query, the default for a missing value, and the two functions that undo each other.
chapter: Expressions and types
minutes: 12
status: draft
---

## CASE is an expression

```sql
select title,
       case when pages > 300 then 'long' else 'short' end as length_class
from book;
```

```text
         title            length_class
-------------------------  ------------
The Left Hand of Darkness  long
A Wizard of Earthsea       short
The Dispossessed           long
Always Coming Home         short
```

`CASE` is an expression rather than a statement, so it can appear anywhere a value can: in the `SELECT` list, in a `WHERE`, in
an `ORDER BY` and inside an aggregate. The searched form is `case when <condition> then <value> ... else <value> end`, and the
first matching branch wins.

The simple form compares one value against a list:

```sql
select title,
       case pages when 304 then 'the known edition' else 'other' end as edition
from book
where pages is not null;
```

```text
         title            edition
-------------------------  ------------------
The Left Hand of Darkness  the known edition
A Wizard of Earthsea       other
The Dispossessed           other
```

Both forms are the same thing: the second is sugar for `case when pages = 304 then ...`. The reason to prefer the searched form
is that the simple one cannot express a range or a combination, and the comparisons it makes are `=` rather than anything else.

A `CASE` with no `ELSE` returns `NULL` when nothing matched, which is usually a bug rather than an intention:

```sql
select title, case when pages > 300 then 'long' end as maybe_long from book;
```

The short books get `NULL` in `maybe_long`, not an empty string, and a report that counts on the column being one of two
values will be surprised. Writing the `else` is worth the line.

## COALESCE takes the first value that is there

```sql
select title, coalesce(pages, 0) as pages_or_zero, coalesce(pages, 0) > 0 as has_pages from book;
```

```text
         title            pages_or_zero  has_pages
-------------------------  -------------  ---------
The Left Hand of Darkness            304          1
A Wizard of Earthsea                 183          1
The Dispossessed                     341          1
Always Coming Home                     0          0
```

`coalesce(a, b, c)` returns the first argument that is not `NULL` and evaluates left to right, so it is the function for a
default. It takes any number of arguments, and the type of the result is the type of the first one in most engines, which is
why `coalesce(pages, 0)` is an integer and `coalesce(pages, 'none')` would give a value you would want to think about.

That same property makes it the function for joining an optional column to a required one:

```sql
select coalesce(title, 'untitled') as title from book;
```

`'untitled'` is a value, so a report can group on the column without a special case for the missing one. Where a database
really is missing rather than empty, `NULL` is still the right thing to store and `coalesce` is the right thing to display
with, which is the distinction the NULL lesson is about.

## NULLIF undoes a division and undoes a COALESCE

```sql
select 10 / nullif(0, 0) as division_by_zero_guarded;
```

```text
division_by_zero_guarded
------------------------
```

`nullif(a, b)` returns `NULL` when the two are equal and `a` otherwise, so `nullif(0, 0)` is `NULL` and the division produces
`NULL` instead of an error. That is the idiom for a rate with a possible zero denominator:

```sql
select total / nullif(count, 0) as average from (select 10 as total, 0 as count);
```

The result is `NULL` where the average is undefined, which a report can display as a dash. The alternative is a `CASE`, which
is four lines for the same thing, and this is the one place `NULL` is genuinely the right answer for arithmetic rather than a
missing input.

It also undoes a `coalesce`:

```sql
select coalesce(nullif(pages, 0), -1) as pages_or_minus_one from book;
```

That is `NULL` for the row with no pages and `-1` for a row with a page count of zero, which is how a report distinguishes
"no data" from "data that says none". Whether that distinction is worth having is a schema decision rather than a query one:
storing `NULL` for unknown and `0` for none is the version that does not need the trick.

## CASE inside an aggregate

```sql
select count(*) as total,
       sum(case when pages > 300 then 1 else 0 end) as long_books,
       count(case when pages is null then 1 end) as missing_pages
from book;
```

```text
total  long_books  missing_pages
-----  ----------  -------------
    4           2              1
```

That is conditional aggregation, and it is the technique behind every "how many of each kind" report. `sum(case ...)` counts
by summing ones, and `count(case ...)` counts the rows that matched because `count` skips a `NULL`. That is the difference
between the two functions from the `NULL` lesson doing real work. Chapter five uses the pattern for a pivot.

The equivalent in PostgreSQL is `count(*) FILTER (WHERE pages > 300)`, which is the standard's spelling and cleaner; SQLite
supports it too from 3.30.

## Check yourself

Classify the books by page count with a `CASE` and give the missing rows a value with `coalesce`. Then compute an average
that cannot divide by zero with `nullif`, and count how many books fall into two categories with `sum(case ...)` in one query.
