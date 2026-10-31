---
title: The standard and its extensions
summary: What is in the standard, what is not, and the spellings that are portable for free.
chapter: The dialect problem
minutes: 12
status: draft
---

## There is a standard

SQL is standardised as ISO/IEC 9075, in parts, and the parts worth knowing by name:

| Part | Covers |
| --- | --- |
| SQL/Foundation | the core: `SELECT`, `INSERT`, constraints, transactions |
| SQL/JSON | JSON path and constructors |
| SQL/PSM | stored procedures and control flow |
| SQL/MED | foreign data and remote sources |
| SQL/Schema | `CREATE SCHEMA`, `GRANT`, `REVOKE` |

The standard is not published for free, which is one reason most working SQL is learnt from the documentation of a specific engine
rather than from the specification. The engines are the practical reference, and the useful skill is knowing which of their
spellings are the standard's and which are theirs.

## The spellings that are portable, and cheap

```sql
select 1 is distinct from null as distinct_from_null, null is not distinct from null as same_null;
```

```text
distinct_from_null  same_null
------------------  ---------
                 1          1
```

`IS DISTINCT FROM` is the comparison that does not return unknown when a side is `NULL`, so `1 IS DISTINCT FROM NULL` is true
rather than unknown. It is the standard's answer to the `NULL` comparison problem and both engines support it.

The other clauses that are in the standard and in every engine:

| Standard | Also spelled | Engines |
| --- | --- | --- |
| `coalesce`, `nullif`, `case` | | all |
| `cast(x as type)` | `x::type` in PostgreSQL | all |
| `current_date`, `current_timestamp` | `now()` in PostgreSQL | all |
| `position('x' in y)` | `instr` in SQLite, `strpos` in PostgreSQL | all |
| `substring(x from 1 for 3)` | `substr` | all |
| `true`, `false` | 1 and 0 in SQLite | all |
| `is [not] distinct from` | | all |
| window functions with `OVER` | | all |
| `with recursive` | | all |

That list is the subset worth writing on purpose, because it costs no more to write `coalesce` than to write an engine's
alternative, and the standard spelling is the one a reader of another engine's documentation recognises.

```sql
select extract(year from '2026-03-15') as extracted_year;
```

```text
Parse error near line 87: near "from": syntax error
```

`EXTRACT` is in the standard and SQLite does not have it: its answer is `strftime('%Y', x)`. PostgreSQL supports `EXTRACT` and also
`date_part`. A date query is one of the places where portable SQL is not available and the dialect has to be chosen.

## The spellings that are extensions

```sql
select title from book order by title fetch first 3 rows only;
```

```text
Parse error near line 78: near "fetch": syntax error
```

`FETCH FIRST n ROWS ONLY` is the standard's way to limit a result and SQLite does not accept it. `LIMIT` is the widely supported
extension, which is a nice example of the world converging on the non-standard spelling: MySQL, SQLite and PostgreSQL all take
`LIMIT`, SQL Server takes `TOP`, and the standard's version is the least used of the three.

Others in the same category:

| Feature | Status |
| --- | --- |
| `LIMIT` / `OFFSET` | an extension, in three of the four engines |
| `FETCH FIRST` | the standard, in PostgreSQL and SQL Server |
| `trim(both ' ' from x)` | the standard, in PostgreSQL, not SQLite |
| `overlay(... placing ... from ... for ...)` | the standard, in PostgreSQL, not SQLite |
| `on conflict ... do update` | vendor; the standard's `MERGE` is the cousin |
| `group_concat` | vendor; the standard is `listagg`, PostgreSQL has `string_agg` |
| `pragma` | SQLite only |
| `show` | PostgreSQL, and SQLite has no equivalent |
| `auto_increment` | vendor, and every engine spells it differently |

`MERGE` is the standard's statement for "insert, update or delete depending on a match". PostgreSQL 15 and SQL Server have it, and
SQLite does not. The `ON CONFLICT` spelling is shorter for the common case and it is not the standard, which is the trade most
projects take.

## The three categories of divergence

1. **A spelling difference.** `substr` against `substring`, `limit` against `top`. A rename, and the reason `LIMIT` is worth using
   despite being an extension.
2. **A feature that is missing.** `EXTRACT`, `ANY` and `ALL`, `ROLLUP`, `VALUES` in `FROM`. The query has to be rewritten or the
   engine changed.
3. **A behaviour that differs.** `1 = '1'`, `LIKE` and case, the default collation, month arithmetic, the default of
   `foreign_keys`. Nothing fails and the results differ. This is the category that ships bugs, and the reason this chapter exists.

## What to do about it

- **Write the portable spelling when it costs nothing.** `coalesce`, `case`, `is distinct from`, `substring(... from ... for ...)`.
- **Use the extension when the alternative is a worse query.** `LIMIT` and `ON CONFLICT` are worth it, since every engine has one
  and the standard's version is not more readable.
- **Keep the differences in one file.** A repository or a query module makes the count of dialect-specific statements visible, and
  that count is the estimate of what moving engines would cost.
- **Read the engine's own documentation for the engine you deploy on.** The standard is the map, the engine is the territory, and
  the territory is what the query runs in.

## Check yourself

Take a query you have written and replace every function with a standard spelling where one exists, then run it on both engines
and note what fails. Try `fetch first` and `extract` in SQLite and write down both errors. Finish by classifying five differences
from the previous page into the three categories above.
