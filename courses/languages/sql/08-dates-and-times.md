---
title: Dates and times
summary: There is no date type, the text form that sorts correctly, and the month that normalises.
chapter: Expressions and types
minutes: 13
status: draft
---

## A date is text, and it is the right text

```sql
select typeof(date('now')) as type_of_date, typeof(unixepoch('now')) as type_of_epoch;
```

```text
type_of_date  type_of_epoch
------------  -------------
text          integer
```

SQLite has no date type. A date is stored as text in the ISO 8601 form, `YYYY-MM-DD`, and a moment as
`YYYY-MM-DD HH:MM:SS`. The form is not arbitrary: those strings sort and compare correctly as text, because the widest unit
comes first, so `where published < '1970-01-01'` compares dates without converting anything.

The `date` and `datetime` functions return text in that form, `unixepoch` returns an integer count of seconds and `julianday`
a real count of days. Storing text and converting for arithmetic is the arrangement I use, because a date in a client is
readable as it stands. Chapter eleven covers PostgreSQL's real `date` and `timestamptz` types.

## Reading the clock

```sql
select date('now') as today, datetime('now') as now, unixepoch('now') as epoch;
```

```text
today       now                  epoch
----------  -------------------  -----------
2026-10-31  2026-10-31 07:15:22   1793428522
```

`'now'` is a literal the functions understand and it is evaluated in UTC. `date('now')` truncates to the day, `datetime` keeps
the seconds and `unixepoch` gives seconds since 1970. Every one of them takes modifiers, which is where the real work is done.

## Modifiers do the arithmetic

```sql
select date('2026-03-15', '-1 year') as last_year,
       date('2026-03-15', 'weekday 0') as next_sunday,
       date('2026-03-15', '+45 days') as six_weeks_on;
```

```text
last_year   next_sunday  six_weeks_on
----------  -----------  ------------
2025-03-15  2026-03-15   2026-04-29
```

Modifiers are applied left to right and each one is a string: `+N days`, `-N months`, `start of month`, `start of year`,
`weekday 0` for the next Sunday, `unixepoch`. `'weekday 0'` returns the same day when it already is that weekday, which is why
`next_sunday` above is the input date: the 15th of March 2026 is a Sunday.

```sql
select date('2026-01-31', 'start of month', '+1 month', '-1 day') as last_day_of_month;
```

```text
last_day_of_month
-----------------
2026-01-31
```

That chain is the idiom for the last day of the month, and the order matters: truncate to the first, add a month, step back a
day. Written as a single `+1 month` it would not work, for the reason in the next section.

## A month is not thirty days

```sql
select date('2026-01-31', '+1 month') as normalised;
```

```text
normalised
----------
2026-03-03
```

The 31st of January plus one month is the 3rd of March, because February has no 31st and SQLite normalises the overflow
forward instead of clamping. `date('2026-02-30')` is `2026-03-02` for the same reason.

PostgreSQL clamps instead:

```text
 happens_on |    plus_a_month
------------+---------------------
 2026-01-31 | 2026-02-28 00:00:00
```

Two engines, two reasonable answers, and neither is the one a reader assumes. Anything that adds a month to a date has to say
which behaviour it wants, and the truncate-and-step chain above gives a defined answer in both.

## Differences, durations and formatting

```sql
select julianday('2026-03-15') - julianday('2026-03-01') as days_between;
```

```text
days_between
------------
        14.0
```

Subtracting two `julianday` values gives a real, so 14 days is `14.0`. `unixepoch` gives integers when whole seconds are
enough, and `strftime('%s', ...)` is the older spelling of the same thing. Chapter six uses both to count an overdue loan in
days.

```sql
select strftime('%Y-%m', '2026-03-15') as year_month,
       strftime('%d/%m/%Y', '2026-03-15') as reformatted,
       strftime('%A', '2026-03-15') as weekday_name;
```

```text
year_month  reformatted  weekday_name
----------  -----------  ------------
2026-03     15/03/2026   Sunday
```

`strftime` formats with the C codes: `%Y`, `%m`, `%d`, `%H`, `%M`, `%S`, `%A` for the weekday name, `%j` for the day of the
year. It parses too, with the `'unixepoch'` modifier saying the input is a Unix timestamp, but reading a date in an arbitrary
form is the weakest part of SQLite's date support. Store ISO and convert at the edge.

## A bad date is silent

```sql
select date('2026-02-30') as impossible, date('not a date') as not_a_date;
```

```text
impossible  not_a_date
----------  ----------
2026-03-02
```

Neither is an error. An impossible date rolls over, and a value the parser cannot read becomes `NULL` rather than a
complaint. PostgreSQL refuses both:

```text
ERROR:  invalid input syntax for type date: "not a date"
LINE 1: insert into event (happens_on) values ('not a date');
                                               ^
```

A text date column in SQLite accepts whatever a program writes into it, so a typo becomes a `NULL` that no report mentions. A
`STRICT` table does not help here, because the declared type is text either way. The defence is a `CHECK` constraint on the
column, which chapter seven covers.

## In PostgreSQL the types are real

```text
 happens_on |    a_month_later
------------+---------------------
 2026-01-31 | 2026-02-27 00:00:00
```

A `date` column holds a date, `timestamptz` holds a moment with a time zone, and `interval '1 month'` is a duration type
rather than a string. `timestamptz` stores an instant and renders it in the session's zone, so the same value reads
differently in two sessions and compares correctly regardless, which is the behaviour a server wants. `date_trunc('month', d)`
and `to_char(d, 'DD/MM/YYYY')` are the formatting pair, and `age()` returns an interval.

SQLite has none of that, and the reason is scale: it is a library inside a program, so the program's own time zone and its own
date library are already there. On a server, the database has to be the authority.

## The rules

1. Store `YYYY-MM-DD` and `YYYY-MM-DD HH:MM:SS`, in UTC.
2. Convert with modifiers rather than arithmetic on the parts.
3. Add a month with `start of month`, `+N months`, `-1 day`, never a bare `+1 month`.
4. Compare as text, which works because of the format.
5. Constrain the column, because a text date accepts anything.
6. Compute a difference with `julianday` or `unixepoch` and remember which one gives a real.

## Check yourself

Print today with `date`, `datetime` and `unixepoch`, then the same date a year ago and in six weeks. Add a month to the 31st
of January and explain the result, then write the truncate-and-step version that gives the last day of the month. Finish by
inserting `'2026-02-30'` and `'not a date'` into a text column and reading what each one becomes.
