---
title: Types and storage classes
summary: Five storage classes, a declared type that is only an affinity, and the money column that must not be a float.
chapter: Expressions and types
minutes: 13
status: draft
---

## SQLite has five storage classes

```sql
select typeof(1) as t_int, typeof(1.0) as t_real, typeof('1') as t_text,
       typeof(null) as t_null, typeof(x'00') as t_blob;
```

```text
 t_int   t_real  t_text  t_null  t_blob
-------  ------  ------  ------  ------
integer  real    text    null    blob
```

A value in SQLite is one of five things: `NULL`, `INTEGER`, `REAL`, `TEXT` or `BLOB`. There is no `date`, no `boolean`, no
`numeric` and no `varchar`: a date is text or a number, a boolean is an integer 0 or 1, and a string is text of any length.
`typeof` reports the storage class of a value rather than the declared type of a column.

## A declared type is an affinity

```sql
create table loose(a integer, b text);

insert into loose(b) values ('text in a text column');
insert into loose(a) values (42);
insert into loose(a) values ('text in an integer column');
insert into loose(a) values (3.5);

select a, typeof(a) as type_of_a from loose;
```

```text
a              type_of_a
-------------------------  ---------
                           null
                       42  integer
text in an integer column  text
                      3.5  real
```

The column declared `integer` is holding text. SQLite applied the column's **affinity** to each value on the way in: it tried
to convert it to an integer and stored it as text because it could not. The declared type is a hint about how to convert
rather than a constraint on what can be stored.

That is a deliberate decision with a real benefit and a real cost. The benefit is that a column can hold whatever a program
has, which is what makes SQLite painless as an application file format. The cost is that a typo in a number is stored as text
and every arithmetic operation on it depends on the coercion rules, which is why `STRICT` exists.

The affinity rules, in the order they apply:

| Declared type contains | Affinity | What happens to a value |
| --- | --- | --- |
| `INT` | INTEGER | a text value that looks like an integer becomes one |
| `CHAR`, `CLOB`, `TEXT` | TEXT | a number becomes its text form |
| `BLOB`, or nothing | BLOB | nothing is converted |
| `REAL`, `FLOA`, `DOUB` | REAL | an integer becomes a real |
| anything else | NUMERIC | a text value becomes a number or a real if it can |

## STRICT tables enforce the type

```sql
create table strict_t(a integer, b text) strict;

insert into strict_t(b) values (21);
insert into strict_t(a) values ('21');

select a, typeof(a) as ta, b, typeof(b) as tb from strict_t;
```

```text
a     ta      b     tb
--  -------  ----  ----
    null     21    text
21  integer        null
```

A `STRICT` table, which arrived in SQLite 3.37, restricts the allowed types to five named ones and applies the declaration as
a rule rather than a hint. It converts where it can, which is why the integer 21 became the text `'21'` and the text `'21'`
became the integer 21, and it refuses where it cannot:

```sql
insert into strict_t(a) values ('21 text');
```

```text
Error near line 11: cannot store TEXT value in INTEGER column strict_t.a
```

The message names the column. A new table in an application should be `STRICT`, and the reason is what the loose table
demonstrated: without it, a bug in the writer becomes a value that no query can do arithmetic on.

## Comparison is by storage class first

```sql
select 1 = '1' as int_equals_text, 1 = 1.0 as int_equals_real;
```

```text
int_equals_text  int_equals_real
---------------  ---------------
              0                1
```

An integer never equals a text value, because SQLite compares the storage class before the value. `1 = 1.0` is true because
an integer and a real are both numbers, and a text `'1'` is a different kind of thing. In PostgreSQL the same comparison is
true:

```text
 int_equals_text | int_equals_real
-----------------+-----------------
 t               | t
```

PostgreSQL converted the text literal to an integer, because its column types are enforced and the literal had a known type.
That difference is one of the ones that bites when SQL written for one engine is moved to the other.

## Numbers are coerced in arithmetic and not in comparison

```sql
select '5' + 5 as text_plus_int, typeof('5' + 5) as result_type;
```

```text
text_plus_int  result_type
-------------  -----------
           10  integer
```

The text `'5'` was converted to a number for the arithmetic and the result is an integer, while `'5' = 5` is false. The two
rules disagree and both are documented, so a value that has to be a number should be stored as one rather than converted
later.

## The money problem

```sql
select 0.1 + 0.2 as naive, 0.1 + 0.2 = 0.3 as equals_03;
```

```text
naive         equals_03
-------------------  ---------
0.30000000000000004          0
```

A `REAL` is a 64-bit binary float, so most decimal fractions are not exactly representable and arithmetic on them accumulates
error. A price, a balance and a tax amount belong in an `INTEGER` column holding the smallest unit: pence, cents or whatever
the currency's minor unit is.

```sql
create table price(id integer primary key, pence integer not null);
```

`19.99` is stored as `1999` and divided by 100 where it is displayed, which is where formatting belongs. The alternative is
PostgreSQL's `numeric`, a decimal type with exact arithmetic that SQLite does not have and which the dialect chapter covers.

## NULL wins over every conversion

```sql
select 1 + null as one_plus_null, 'a' || null as concat_null, null * 0 as null_times_zero;
```

```text
one_plus_null  concat_null  null_times_zero
-------------  -----------  ---------------
```

All three are `NULL`, including the multiplication by zero, which is the row that catches people: a missing quantity times a
zero price is still unknown rather than zero. The useful consequence is that a missing value propagates through an
expression instead of silently becoming a number, and the cost is that a `WHERE` on such an expression excludes the row.

## Check yourself

Create the loose table, insert a text value into an integer column and read `typeof` to see what was stored. Create the same
table `STRICT` and read the error from the same insert. Then run `0.1 + 0.2 = 0.3` and write down how you would store a price
and a quantity instead.
