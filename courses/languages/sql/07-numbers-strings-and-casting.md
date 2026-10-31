---
title: Numbers, strings and casting
summary: Integer division, the conversions that happen without asking, and the ones you have to write.
chapter: Expressions and types
minutes: 12
status: draft
---

## Division is integer division

```sql
select 10 / 3 as int_div, 10.0 / 3 as real_div, 10 % 3 as modulo, -7 % 3 as negative_mod;
```

```text
int_div       real_div       modulo  negative_mod
-------  ------------------  ------  ------------
      3  3.3333333333333335       1            -1
```

Two integers divide to an integer, truncating towards zero, which is the rule in C, Go and Java and the opposite of what a
reader expecting a decimal assumes. The fix is to make one side a real: `10.0 / 3`, `cast(10 as real) / 3` or `10 * 1.0 / 3`.
A percentage or an average computed from two integer counts is where this bites, and the symptom is a result that is always
a whole number.

`%` is the remainder and takes the sign of the left operand, so `-7 % 3` is `-1` and not `2`. `null % 3` is `null`.

## Casting

```sql
select cast('42' as integer) as to_int, cast(42 as text) as to_text,
       cast('3.7' as integer) as truncates, cast(42.9 as integer) as also_truncates;
```

```text
to_int  to_text  truncates  also_truncates
------  -------  ---------  --------------
    42  42               3              42
```

`CAST(value AS type)` converts, and the target is one of SQLite's five storage classes or a word that maps to an affinity.
Casting a real to an integer truncates rather than rounds, so `cast(42.9 as integer)` is 42 while `round(42.9)` is 43.

A cast that cannot succeed produces a number rather than an error, which matters before it corrupts something:

```sql
select cast('abc' as integer) as garbage, cast('12abc' as integer) as partial;
```

```text
garbage  partial
-------  -------
      0       12
```

`'abc'` became 0 and `'12abc'` became 12: SQLite reads as much as it can and gives up on the rest. PostgreSQL raises an error
instead, which is the better behaviour for an import and the reason to validate before casting rather than after.

## The implicit conversions

A value is converted without a `CAST` in arithmetic:

```sql
select '5' + 5 as text_plus_int, typeof('5' + 5) as result_type;
```

```text
text_plus_int  result_type
-------------  -----------
           10  integer
```

The rules, which explain a result that otherwise looks like magic:

| Left | Right | Result |
| --- | --- | --- |
| integer | integer | integer |
| integer | real | real |
| integer or real | text | the text is read as a number, and 0 if it is not |
| text | text | integers if both look like integers, reals if either looks like a real |
| anything | `NULL` | `NULL` |

The last row is the one to hold on to: `NULL` wins over every conversion, so a missing value propagates instead of becoming a
zero. The row above it is the dangerous one, because `'abc' + 1` is `1` and nothing reports it.

## Rounding

```sql
select round(2.5) as round_half, round(3.5) as round_half_up, round(2.345, 2) as two_places;
```

```text
round_half  round_half_up  two_places
----------  -------------  ----------
       3.0            4.0        2.35
```

`round(x)` gives a real and rounds a half away from zero, so 2.5 is 3.0 and 3.5 is 4.0. That is not the banker's rounding
some languages use for money, and it is not exact either: it rounds the float, so a value a hair below a half rounds down.
`round(x, n)` keeps `n` decimal places and is the function for display; round money with integer arithmetic instead.

## Formatting

```sql
select printf('%.2f', 19.99) as money, printf('%05d', 42) as padded,
       printf('%s has %d pages', 'A book', 304) as sentence;
```

```text
money  padded  sentence
-----  ------  --------------------
19.99  00042   A book has 304 pages
```

`printf` is SQLite's formatting function and `format` is an alias for it in recent versions. The verbs are C's: `%d`, `%f`,
`%s`, `%x`, each with an optional width and precision. It is the function to reach for when a value has to leave the database
pre-formatted, and the argument against that is that presentation belongs in the client, which knows the locale.

## || and printf disagree about NULL

```sql
select 'a' || null as with_operator, printf('[%s]', null) as with_printf;
```

```text
with_operator  with_printf
-------------  -----------
               []
```

The operator propagates `NULL` and `printf` substitutes an empty string, so the two produce different results for the same
missing value. The difference has a consequence worth knowing:

```sql
select coalesce(printf('%s', null), 'was null') as coalesced;
```

```text
coalesced
---------
```

That is empty rather than `was null`, because `printf` returned an empty string rather than `NULL` and `coalesce` had nothing
to replace. A missing value that has already been through a formatter is indistinguishable from an empty one, which is the
argument for formatting at the edge rather than in the query.

## Concatenating a string and a number

```sql
select 'id-' || 42 as concat_int, 'id-' || 42.0 as concat_real;
```

```text
concat_int  concat_real
----------  -----------
id-42       id-42.0
```

`||` converts the number with SQLite's own text form, so a real keeps its trailing `.0` and a value that needs two decimal
places will not get them. Where the format matters, `printf` is the one to use: `printf('id-%.2f', 42)` is `id-42.00`.

## The string functions you will use most

```sql
select length('hello') as len, upper('a') as up, lower('A') as low,
       substr('abcdef', 2, 3) as middle, instr('abcdef', 'cd') as position,
       replace('a-b-c', '-', '+') as replaced, trim('  x  ') as trimmed;
```

```text
len  up  low  middle  position  replaced  trimmed
---  --  ---  ------  --------  --------  -------
  5  A   a     bcd         3     a+b+c     x
```

`substr` counts from 1 rather than 0, and takes a start and a length; `instr` returns 1-based position or 0 when there is no
match; and `trim` removes spaces from both ends. Chapter three has the rest, including the `||`-free way to join a set of
values into one string.

## Check yourself

Print `10 / 3`, `10.0 / 3` and `10 % 3`. Cast `'12abc'` to an integer and read what it becomes, then cast the same value in
PostgreSQL and compare. Finish by formatting a price with `printf` and explaining why the price itself should not be stored
as a real.
