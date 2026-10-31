---
title: SQLite and PostgreSQL side by side
summary: The differences that change behaviour, collected, with the consequence of each.
chapter: The dialect problem
minutes: 13
status: draft
---

## Why this chapter exists

Every example in this course ran on SQLite, and the Spring Boot course in this catalogue runs on PostgreSQL. Moving SQL between
them is ordinary work, and the differences that matter are the ones that change a **result** rather than the ones that raise an
error. An error is a five-minute fix; a query that returns different rows on the two engines is a bug that ships.

## Types and values

| Behaviour | SQLite | PostgreSQL |
| --- | --- | --- |
| declared column type | an affinity, a hint | enforced |
| an integer column holding text | stored as text | `invalid input syntax for type integer` |
| `1 = '1'` | `0`, false | `t`, true, because the literal is converted |
| `'5' + 5` | `10` | `10` |
| `cast('abc' as integer)` | `0` | an error |
| a boolean | an integer 0 or 1 | `boolean` |
| money | an integer of pence | `numeric` for exact decimals |
| dates | text in ISO form | `date`, `timestamp`, `timestamptz` |
| `typeof(x)` | the storage class | `pg_typeof(x)` |

The second row bites hardest because it is silent: a typo in a number stays a string in SQLite and the arithmetic on it depends on
the coercion rules. The third row changes a comparison's answer, which surfaces as a report with different numbers rather than as a
failure.

## Dates

```text
SQLite:      date('2026-01-31', '+1 month')          -> 2026-03-03   normalised forward
PostgreSQL:  date '2026-01-31' + interval '1 month'  -> 2026-02-28   clamped
```

Two reasonable answers, neither of them the one a reader assumes, and no query that adds a month is portable without deciding which
one it wants. The truncate-and-step chain from the dates lesson gives a defined answer in both:

```sql
date('2026-01-31', 'start of month', '+1 month', '-1 day')
```

SQLite's date functions are `date`, `datetime`, `strftime`, `julianday` and `unixepoch`, and they take string modifiers.
PostgreSQL has real types, `interval` arithmetic, `date_trunc`, `to_char`, `age()` and `generate_series`.

## Text

| Behaviour | SQLite | PostgreSQL |
| --- | --- | --- |
| `LIKE` and case | insensitive for ASCII | sensitive |
| the case-insensitive operator | none, `LIKE` already is | `ILIKE` |
| `GLOB` | case-sensitive, Unix wildcards | none, use `~` |
| regular expressions | `REGEXP` in current versions | `~`, `~*`, `regexp_replace` |
| concatenation with `NULL` | `NULL` | `NULL` |
| joining a set | `group_concat` | `string_agg` |
| sorting | `BINARY` by default | locale-aware by default |
| case-insensitive sort | `COLLATE NOCASE`, ASCII only | a collation, Unicode aware |

The first and last rows change results. `'abc' LIKE 'A%'` is true in SQLite and false in PostgreSQL, so a name search changes
behaviour when it moves engines. A sort is byte order in SQLite and locale order in PostgreSQL, which differs on case and accents.

## Statements and clauses

| Feature | SQLite | PostgreSQL |
| --- | --- | --- |
| limiting | `LIMIT n OFFSET m` | the same, plus `FETCH FIRST` |
| upsert | `ON CONFLICT ... DO UPDATE` | the same |
| `RETURNING` | since 3.35 | since 8.2 |
| `FILTER` on an aggregate | since 3.30 | yes |
| `RIGHT` and `FULL OUTER JOIN` | since 3.39 | yes |
| `ANY` and `ALL` | a syntax error | yes |
| `GROUP BY ROLLUP`, `CUBE`, `GROUPING SETS` | a syntax error | yes |
| `VALUES` as a table in `FROM` | a syntax error | yes |
| `generate_series` | none, use a recursive query | yes |
| `MATERIALIZED` on a CTE | none | yes |
| `LATERAL` joins | none | yes |
| window functions | since 3.25 | yes |
| a window `EXCLUDE` clause | yes | yes |

The `ANY` and `ALL` row looked portable and is not, which is why the subquery lesson used `> (select min(...))` instead. `VALUES`
in `FROM` is the same kind of surprise: it works in a CTE in both and only PostgreSQL takes it as a table expression.

## Schema and administration

| Feature | SQLite | PostgreSQL |
| --- | --- | --- |
| server | none, a library | a process |
| concurrency | one writer, many readers | MVCC, many of both |
| isolation | file locking, no setting | four levels, `read committed` by default |
| users and grants | none, filesystem only | roles, grants, column grants, RLS |
| `ALTER TABLE` | add, rename, drop a column only | change a type, add a constraint, and more |
| `ALTER COLUMN` | not supported | yes |
| deferred constraints | `deferrable initially deferred` | the same |
| foreign keys | off by default per connection | always enforced |
| stored procedures | none | PL/pgSQL and others |
| triggers | SQL statements, no recursion by default | a function, statement-level, recursion |
| transactional DDL | yes | yes |
| materialised views | none | yes |
| full-text search | FTS5 | `tsvector` with a GIN index |
| JSON | the `json_*` functions | `json` and `jsonb`, indexed |

The concurrency row is the architectural difference and the reason both exist. SQLite serialises writers, which makes it the fastest
possible option for one writer and the wrong choice for many. PostgreSQL gives each writer a snapshot and lets them proceed, which
costs a server and is what a web application needs.

## What is genuinely the same

Everything in this course not on the lists above, which is most of it: `SELECT` with a `WHERE`, joins with `ON`, `GROUP BY` and
`HAVING`, subqueries, `CASE`, window functions, transactions with `BEGIN` and `COMMIT`, `INSERT ... SELECT`, constraints, indexes
and query planning. A reader of this course can move between the two engines and expect their SQL to work, with the differences
collected here to check against.

## The three habits that avoid the problem

1. **Write SQL as if both engines matter**, unless you have decided they do not. That means comparing a column to a value rather
   than a function of the column, using the truncate-and-step date idiom, and avoiding `ANY` and `ALL`.
2. **Test against the engine you deploy on.** A suite on SQLite and production on PostgreSQL catches a fraction of the
   differences, and the ones it misses are the silent ones.
3. **Put the dialect-specific SQL in one place.** A repository method, a query file, a view. Then the differences are in one file
   and the count of them is visible.

## Check yourself

Run `select 1 = '1'` and `select 'abc' like 'A%'` on both engines and write down both answers. Add a month to the 31st of January
on both. Then take a query of your own that uses `LIMIT`, a `LIKE` and a date function and list every place it would behave
differently.
