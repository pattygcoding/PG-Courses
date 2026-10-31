---
title: Identifiers, collations and case
summary: Byte order against locale order, the case folding that stops at ASCII, and the name that sorts last.
chapter: The dialect problem
minutes: 12
status: draft
---

## The default sort is byte order

```sql
select 'Apple' < 'banana' as upper_before_lower, 'a' < 'B' as a_before_b;
```

```text
upper_before_lower  a_before_b
------------------  ----------
                 1           0
```

SQLite compares text with the `BINARY` collation, which is a byte comparison. In ASCII, every uppercase letter is below every
lowercase one, so `'Apple' < 'banana'` is true and `'a' < 'B'` is false. A name list sorted with the default collation therefore
puts every name starting with an uppercase letter before every name starting with a lowercase one, which is not the order a
person reading the list expects. With clean data where every name is capitalised, it looks correct and hides the problem:

```sql
select name from member order by name;
```

```text
  name
---------
Ada
Alan
Grace
Katherine
```

Add a member called `ada` and she sorts after `Katherine`. That is the bug the default collation produces, and it appears the day
the data does.

```sql
select 'apple' = 'APPLE' as exact_compare, 'apple' collate nocase = 'APPLE' as nocase_compare;
```

```text
exact_compare  nocase_compare
-------------  --------------
            0               1
```

`COLLATE NOCASE` folds the case for a comparison, and it can be applied to a column, an expression or an index. It belongs in the
index as well as the query:

```sql
create index idx_member_name on member(name collate nocase);
select name from member where name = 'ada' collate nocase;
create unique index idx_member_email on member(email collate nocase);
```

The third statement is a case-insensitive uniqueness rule, which is what an email column usually wants: `Ada@example.com` and
`ada@example.com` are the same mailbox. Without the collation on the index, both are stored.

## NOCASE stops at ASCII

```sql
select char(197) as ring_a, length(char(197)) as chars, length(cast(char(197) as blob)) as bytes;
```

```text
ring_a  chars  bytes
------  -----  -----
Å           1      2
```

`char(197)` is a single character, U+00C5, stored in two bytes of UTF-8. `length` counts characters for text and bytes for a blob,
which is why the same value is 1 and 2.

```sql
select char(197) = 'A' as accent_equals_a, char(197) collate nocase = 'A' as nocase_equals_a;
```

```text
accent_equals_a  nocase_equals_a
---------------  ---------------
              0                0
```

**`COLLATE NOCASE` does not fold a non-ASCII character.** It upper-cases and lower-cases the ASCII range only, so it handles
`a` against `A` and does nothing for `å`, `é`, `ñ` or a Greek letter. A case-insensitive comparison of names from a European
address book needs something else:

| Approach | Handles |
| --- | --- |
| `COLLATE NOCASE` | ASCII |
| a lower-cased copy in a column, lower-cased on write | what SQLite's `lower()` handles, which is Unicode for Latin-1 |
| `like` (already case-insensitive in SQLite) | ASCII |
| PostgreSQL with a Unicode collation | Unicode |

The second row is the portable answer: store a normalised column, index it, and compare against a normalised value. The
normalisation happens once at write time rather than on every comparison, and the rule about which characters fold is in one place
in the code.

## Accents and the collation in PostgreSQL

PostgreSQL's default collation comes from the database's locale, so `'Apple' < 'banana'` and `'a' < 'B'` are true there, which is
the opposite of SQLite's byte order for the second one. Three consequences:

- **A sort is locale-aware by default**, so an accent sorts next to its base letter rather than after `Z`.
- **A case-insensitive comparison is `ILIKE` or a `citext` column**, not a collation on the fly.
- **An index has to use the same collation as the query**, which is why an index created before a collation change may stop being
  used. `text_pattern_ops` on a column is the version that sorts by bytes for a prefix search.

```sql
select 'apple' = 'APPLE' collate "C" as binary_compare;
select name from member where name ilike 'a%';
```

The `"C"` collation in PostgreSQL is the byte-order one, which makes it the closest thing to SQLite's default. Naming it
explicitly is how a sort that has to be stable across locales is written.

## Which to choose

The decision has one question behind it: is this column read by a person or by a machine?

- **A machine** compares identifiers, codes and slugs, and it wants byte order, because byte order is the same everywhere. An
  `email`, an ISO code, a `lowercase_slug`.
- **A person** sorts names and titles, and wants locale order, which means a collation and the knowledge that locale order is a
  policy rather than a constant.

For a display sort I use a stored normalised column and sort by it. For everything else I use the default and let the bytes decide,
because a sort that changes with the server's locale is a paginated list that shows a row twice when the locale changes.

## Check yourself

Run the two comparisons at the top of this page and write down both answers. Create a name column with a mixed-case value and
confirm the default sort puts the lowercase one last, then fix it with a collation on the index and the query. Finish by proving
that `COLLATE NOCASE` does not fold an accented character, and saying what you would store instead.
