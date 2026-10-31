---
title: Regular expressions and text search
summary: The three pattern tools, the one that needs registering, and why a pattern cannot use an index.
chapter: Querying one table
minutes: 12
status: draft
---

## Three ways to match text

| Tool | Wildcards | Case | Use for |
| --- | --- | --- | --- |
| `=` | none | exact | an exact value |
| `LIKE` | `%`, `_` | insensitive in SQLite | a prefix, a contains |
| `GLOB` | `*`, `?`, `[...]` | sensitive | a case-sensitive pattern |
| `REGEXP` | full regular expressions | sensitive | a real pattern |

`LIKE '%needle%'` is the contains check and it looks for a wildcard at each end. `GLOB` replaces `%` with `*` and `_` with
`?`, adds `[...]` character classes, and compares case-sensitively. Chapter four's string lesson has the escape clause and
the case rules.

## REGEXP works, but not everywhere

```sql
select 'abc' regexp 'a.*' as basic, 'abc' regexp 'z' as no_match, 'abc' regexp '^b' as anchored;
```

```text
basic  no_match  anchored
-----  --------  --------
    1         0         0
```

```sql
select 'ABC' regexp 'abc' as case_sensitive, 'a1' regexp '[0-9]' as char_class;
```

```text
case_sensitive  char_class
--------------  ----------
             0           1
```

In SQLite 3.54, which is what I ran, `REGEXP` works in the command line tool and understands character classes, anchors and
alternation. It is case-sensitive. It is worth checking on your own version, though, because for most of SQLite's life
`REGEXP` was a hook rather than an implementation: the syntax existed and the engine called a function the application was
supposed to provide, so `REGEXP` was an error unless a program registered one. A lot of advice on the internet still says
SQLite has no regular expressions, and on the version you are using that may be true.

```sql
select title from book where title regexp '(Earthsea|Ficciones)' order by title;
select title from book where title regexp '^The ';
```

```text
         title
--------------------
A Wizard of Earthsea
Ficciones

         title
-------------------------
The Left Hand of Darkness
The Dispossessed
```

Two titles match the alternation and two start with `The`. Note that `length('abc') regexp '3'` is true, because the
expression on the left is evaluated before the operator compares it, which is how a computed value can be matched.

## PostgreSQL has the full set

```text
 tilde | tilde_star | no_match
-------+------------+----------
 t     | t          | f
```

```sql
select 'abc' ~ 'a.c' as tilde, 'ABC' ~* 'a.c' as tilde_star, 'abc' ~ 'z' as no_match;
```

`~` matches, `~*` matches without regard to case and `!~` is the negation. The functions around it are the useful part:

```text
 replaced_all | replaced_first
--------------+----------------
 a+b+c        | a+b-c
```

```sql
select regexp_replace('a-b-c', '-', '+', 'g') as replaced_all,
       regexp_replace('a-b-c', '-', '+') as replaced_first;
```

The fourth argument `'g'` means every occurrence and leaving it out replaces only the first, which is the opposite of what the
`replace` function does and the reason this is worth checking rather than assuming.

```text
    parts
--------------
 {2026,10,31}
```

```sql
select regexp_matches('2026-10-31', '(\d{4})-(\d{2})-(\d{2})') as parts;
```

`regexp_matches` returns the capture groups from the first match, and `regexp_split_to_array` with `unnest` is how a string is
split into rows, which SQLite does with a recursive query instead.

## A pattern cannot use an index

A regular expression is a function evaluated once per row, so the engine cannot use a B-tree index on the column to find the
matching rows. The same is true of `LIKE '%value%'`, and not of `LIKE 'value%'`, which can use an index because the start of
the string is known.

The practical shape is to filter on something indexable first and pattern-match what is left:

```sql
select title from book where author_id = 1 and title regexp '^The ';
```

The engine can use the index on `author_id` to reach four rows and evaluate the pattern on those. On a table of millions, that
is the difference between a scan of everything and a handful of rows. Where the pattern has to be applied to every row, the
answer is a full-text index, which chapter nine covers, or a search service that owns the problem.

## When not to do it in SQL

Regular expressions in a query are hard to read, hard to test and impossible for the planner to optimise. Two alternatives are
usually better:

- **Normalise the column.** If every query parses a phone number out of a free-text field, the field wants to be a column, and
  the parsing wants to happen once at write time rather than on every read.
- **Search from the application.** Something with a proper search index does relevance, stemming and ranking, which no
  `LIKE` will do.

The regex is still the right tool for a one-off data cleanup and for a report nobody runs twice.

## Check yourself

Match a title with `LIKE`, with `GLOB` and with `REGEXP`, and write down which of the three is case-sensitive. Match a pattern
with a character class and one with an alternation. Then take a query with a `%pattern%` in it and rewrite it so the engine can
use an index on another column first.
