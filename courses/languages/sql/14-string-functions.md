---
title: String functions
summary: Extracting, trimming, replacing and matching text, and the wildcards that differ between two operators.
chapter: Querying one table
minutes: 12
status: draft
---

## Extracting part of a string

```sql
select substr('abcdef', 2, 3) as middle, substr('abcdef', -2) as last_two, substr('abcdef', 2) as from_two;
```

```text
middle  last_two  from_two
------  --------  --------
bcd     ef        bcdef
```

`substr(text, start, length)` counts from 1, not from 0, which is the first thing to check when a result is off by one
character. The length is optional and a negative start counts back from the end. `substring` is a synonym in SQLite, and the
standard's two-argument spelling `substring(text from x for y)` works in PostgreSQL.

```sql
select instr('abcdef', 'cd') as found, instr('abcdef', 'zz') as not_found;
```

```text
found  not_found
-----  ---------
    3          0
```

`instr(haystack, needle)` returns the 1-based position or 0 when the needle is not there, so **a zero means not found rather
than position zero**. `instr(...) > 0` is the contains check; `like '%needle%'` is the declarative version of it.

## Trimming and replacing

```sql
select replace('a-b-c', '-', '+') as replaced,
       trim('  x  ') as both, ltrim('  x  ') as left_trimmed, rtrim('  x  ') as right_trimmed;
```

```text
replaced  both  left_trimmed  right_trimmed
--------  ----  ------------  -------------
a+b+c     x     x               x
```

`replace(haystack, from, to)` replaces every occurrence and returns a new string: there is no in-place edit and no regular
expression. `trim`, `ltrim` and `rtrim` remove spaces from both ends, the left or the right, and each takes a set of characters
as a second argument:

```sql
select trim('xxhelloxx', 'x') as chars_trimmed;
```

```text
chars_trimmed
-------------
hello
```

That argument is a **set of characters rather than a substring**, so `trim('abba', 'ab')` is an empty string because every
character in the input is in the set. The mistake is easy to make and it is silent.

## LIKE and GLOB

```sql
select 'abc' like 'A%' as like_is_case_insensitive, 'ABC' glob 'A*' as glob_is_case_sensitive;
```

```text
like_is_case_insensitive  glob_is_case_sensitive
------------------------  ----------------------
                       1                       1
```

`LIKE` is case-insensitive for ASCII in SQLite, which is not the standard's behaviour and not PostgreSQL's either. `GLOB` is
SQLite's case-sensitive operator and uses Unix wildcards: `*` for any run and `?` for one character rather than `%` and `_`.

```text
underscore_is_wildcard  escaped
----------------------  -------
                     1        0
```

`_` matches exactly one character, so `'a_b' LIKE 'a_b'` is true and `'axb'` matches too. Where a literal underscore is
needed, an `ESCAPE` clause names the escape character: `'a_b' LIKE 'a\_b' ESCAPE '\'` is true for the literal and false for
`'axb'`. Without the clause there is no way to say "this underscore is a character rather than a wildcard", which matters for
a name or a filename.

```sql
select 'abc' like '%b%' as contains, 'abc' like 'b%' as no_prefix;
```

```text
contains  no_prefix
--------  ---------
       1          0
```

`'%value%'` is the contains check and it cannot use an index, because a leading wildcard gives the index nothing to seek to.
That is the performance chapter's subject, and the answer for a text search is a full-text index rather than a `LIKE`.

## Formatting with padding

```sql
select printf('%10s|', 'right') as padded, printf('%-10s|', 'left') as left_padded, printf('%d%%', 45) as percent;
```

```text
padded     left_padded  percent
-----------  -----------  -------
     right|  left      |  45%
```

A width right-aligns by default and a minus sign left-aligns, which is how a fixed-width column is produced in SQL. `%%`
prints a literal percent sign. `printf` is the function for a report that has to be readable in a terminal, and the argument
against formatting in the query is that the client should own presentation.

## Bytes, characters and code points

```sql
select char(65, 66) as letters, unicode('A') as code, hex('AB') as hexadecimal;
```

```text
letters  code  hexadecimal
-------  ----  -----------
AB         65  4142
```

`char` turns code points into a string, `unicode` goes the other way and `hex` gives the hexadecimal bytes. `length` returns
characters for text and bytes for a blob, so `length(cast(x as blob))` is how the byte count is asked for when the encoding
matters.

## In PostgreSQL

The functions are mostly the same with different names:

| Task | SQLite | PostgreSQL |
| --- | --- | --- |
| extract | `substr(t, 2, 3)` | `substring(t from 2 for 3)`, `left`, `right` |
| find | `instr(t, 'x')` | `position('x' in t)`, `strpos` |
| split | `printf` and `substr` | `split_part(t, '-', 2)` |
| join a set | `group_concat` | `string_agg` |
| capitalise | none | `initcap` |
| concatenate | `\|\|`, `printf` | `\|\|`, `concat` |
| case-insensitive | `LIKE`, `COLLATE NOCASE` | `ILIKE` |
| pattern | `LIKE`, `GLOB` | `LIKE`, `SIMILAR TO`, `~` |

```text
 second_part | pos | title_cased
-------------+-----+-------------
 b           |   3 | Hello World
```

That is `split_part('a-b-c', '-', 2)`, `position('cd' in 'abcdef')` and `initcap('hello world')`, and the last of the three has
no SQLite equivalent. `ILIKE` is the one people miss most, because SQLite's `LIKE` is already case-insensitive while
PostgreSQL's is not, so a name search changes behaviour when it moves between them.

## Check yourself

Extract the middle of a string and its last two characters, and find the position of a substring with `instr`, remembering
that zero means absent. Show the difference between `LIKE` and `GLOB` on a mixed-case value, and between `_` as a wildcard and
an escaped underscore. Finish by formatting a fixed-width line with `printf` and rewriting it with PostgreSQL's functions.
