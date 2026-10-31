---
title: Common table expressions
summary: Naming an intermediate result, using it twice, and reading a query from the top down.
chapter: Views, CTEs and triggers
minutes: 12
status: draft
---

## WITH names a result

```sql
with expensive as (select id, title, price_pence from book where price_pence > 1000)
select count(*) as count_rows from expensive;
```

```text
count_rows
----------
         4
```

A common table expression is a named subquery, written before the query that uses it. It lasts for that one statement, it replaces a
subquery in a parenthesis, and the difference is entirely about reading: the name at the top says what the result is, and the
query below says what happens to it.

The case for it over a subquery is a query with more than one level of nesting, where the version in parentheses is a wall of
indentation. And the case for it over a view is that it is part of that one statement rather than a name every future query can
see.

## Several, in order

```sql
with per_author as (
  select author_id, count(*) as books, sum(pages) as pages
  from book where pages is not null group by author_id
),
ranked as (
  select author_id, books, pages, rank() over (order by pages desc) as rnk from per_author
)
select a.name, r.books, r.pages, r.rnk
from ranked as r join author as a on a.id = r.author_id
where r.rnk <= 3 order by r.rnk, a.name;
```

```text
      name         books  pages  rnk
-----------------  -----  -----  ---
Ursula K. Le Guin      3    828    1
Octavia E. Butler      2    632    2
Mary Shelley           1    280    3
```

One `with`, two expressions separated by commas, and each can refer to the ones before it. The first aggregates, the second ranks
the aggregates, and the final query joins the ranks to the names. Reading from the top down is the query's data flow, which is
what a `GROUP BY` followed by a window function and a `HAVING` does not give you: without the intermediate names, the rank and the
filter are in the same clause as the aggregate and the order of evaluation is left to the reader.

That structure is the reason I use CTEs most: not for speed, for the shape of a report.

## Using one twice

```sql
with bounds as (select min(published) as first_year, max(published) as last_year from book)
select b.title, b.published, bounds.first_year, bounds.last_year
from book as b, bounds
where b.published = bounds.first_year or b.published = bounds.last_year
order by b.published;
```

```text
       title          published   first_year  last_year
--------------------  ----------  ----------  ----------
Frankenstein          1818-01-01  1818-01-01  1993-10-01
Parable of the Sower  1993-10-01  1818-01-01  1993-10-01
```

The range is computed once and compared against twice, and the result is the earliest and latest book with the bounds printed
beside them. Without the CTE that is either two scalar subqueries or a `HAVING`-shaped rewrite.

The `from book as b, bounds` is a cross join of one row against every book, which is a legitimate use of the multiplication from
the cross join lesson: one row's worth of context attached to every row of a result.

## A CTE is not a temp table

```sql
with big as (select * from event)
select count(*) from big;
```

The result is not stored anywhere, and a CTE referenced twice may be computed twice. SQLite and PostgreSQL are both allowed to
inline a CTE into the query that uses it, and both sometimes materialise it, and the decision is the planner's rather than
yours. `MATERIALIZED` and `NOT MATERIALIZED` in PostgreSQL's `WITH` let you insist, and there is no equivalent in SQLite.

The practical consequences:

- **A CTE is not a cache.** Two references are not two reads of one computation, necessarily, and a CTE over a slow query used
  three times can be slower than a temp table.
- **An index cannot be added to a CTE.** A temp table can have one, which is the reason to use a temp table when an intermediate
  result is big and reused.
- **A recursive CTE is not inlined**, which matters because that is where the ordering of the recursion lives.

Where a query needs an intermediate result with an index, the answer is a temp table and not a CTE. Where it needs a name,
the CTE is right.

## CTE, subquery or view

| | Lives for | Can be reused | Can be indexed |
| --- | --- | --- | --- |
| subquery | one clause | no | no |
| CTE | one statement | by name | no |
| temp table | the session | yes | yes, explicitly |
| view | until dropped | by any query | no |

The choice is between lifetimes, and the four rows are the four answers. A name for one statement is a CTE; a name for one
clause is a subquery; a name for one session is a temp table; a name for everybody is a view.

## The recursion keyword is the other thing WITH does

`with recursive` is the same clause with a different meaning, and it is the subject of the next page. The two forms share a
keyword and nothing else, which is worth knowing before a recursive query is read as if it were an ordinary CTE.

## Check yourself

Rewrite a query with a nested subquery as a chain of two CTEs and compare the two for readability. Use one CTE twice in the same
query and confirm the result is what you expect. Then put the same intermediate result in a temp table, add an index and compare
the plan of a query against each.
