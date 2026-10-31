---
title: Recursive queries
summary: A base case and a step, the column the recursion joins on, and the runaway that a limit hides.
chapter: Views, CTEs and triggers
minutes: 13
status: draft
---

## A base case unioned with a step

```sql
with recursive org(id, name, path) as (
  select id, name, name from category where parent_id is null
  union all
  select c.id, c.name, org.path || ' > ' || c.name from category as c join org on org.id = c.parent_id
)
select id, name, path from org order by path;
```

```text
id       name                         path
--  ---------------  ---------------------------------------
 1  Fiction          Fiction
 3  Fantasy          Fiction > Fantasy
 2  Science fiction  Fiction > Science fiction
 4  Space opera      Fiction > Science fiction > Space opera
 5  Non-fiction      Non-fiction
 6  Essays           Non-fiction > Essays
```

Two parts joined by `union all`. The first is the **base case**, which produces the starting rows: the categories with no parent.
The second is the **step**, which joins the table to the name being built. That join is what makes it recursive: `org` refers to
the result so far, and each pass adds one level.

The step's join direction decides whether the query walks down or up: joining `org.id = c.parent_id` finds the children of the
rows so far, and joining on the parent finds the ancestors. The self-join lesson reached one level with a `JOIN` and needed to
know the depth in advance; this reaches any depth, which is the whole reason it exists.

## The column the recursion joins on

```sql
with recursive ancestors(id, name, parent_id, depth) as (
  select id, name, parent_id, 0 from category where id = 4
  union all
  select p.id, p.name, p.parent_id, ancestors.depth + 1
  from category as p join ancestors on p.id = ancestors.parent_id
)
select id, name, depth from ancestors order by depth desc;
```

```text
id       name        depth
--  ---------------  -----
 1  Fiction              2
 2  Science fiction      1
 4  Space opera          0
```

Space opera at depth 0, its parent Science fiction at 1 and Fiction at 2: the path from a leaf to the root. The detail worth
noticing is that **`parent_id` is in the CTE's column list**. The recursion joins on it, and a column that is not selected is not
available in the recursive part:

```text
Parse error near line 78: no such column: ancestors.parent_id
```

That error is the first thing to check when a recursive query will not compile. The column list has to carry everything the step
needs, including the key it joins on, and the base case's select list has to match it in order and count.

## The step needs a termination condition

```sql
with recursive integers(n) as (select 1 union all select n + 1 from integers where n < 20)
select sum(n) as sum_to_20 from integers;
```

```text
sum_to_20
---------
      210
```

The `where n < 20` is what stops it. Without a condition the recursion runs until it fails rather than politely refusing. What
happens next depends on where the limit lands, and it is not always a failure:

```sql
with recursive bad(n) as (select 1 union all select n + 1 from bad)
select n from bad limit 3;
```

```text
n
-
1
2
3
```

The `limit 3` made an infinite recursion finish, because the outer query stopped asking for rows. That is a coincidence rather
than a technique, since the same query without the `limit` runs until it fails. A recursive step always needs a condition.

The termination condition is usually one of three:

- **A value bound**: `where n < 20`, `where d < '2026-03-07'`.
- **A join that stops matching**, which is the common case for a tree: the last level's step finds no parent and produces no rows.
- **A depth cap**, which is the belt-and-braces version for a tree whose data might contain a cycle: `where depth < 100`.

## Cycles

A `parent_id` that points at a row which eventually points back is a cycle, and a recursive query over it never terminates. A
`CHECK` constraint cannot express "no cycles", so the defences are a depth cap and a visited set:

```sql
with recursive walk(id, name, depth) as (
  select id, name, 0 from category where id = 1
  union all
  select c.id, c.name, walk.depth + 1
  from category as c join walk on c.parent_id = walk.id
  where walk.depth < 100
)
select id, name, depth from walk;
```

PostgreSQL has a better answer, `CYCLE ... SET ... USING PATH`, which detects a repeat and marks the row rather than looping. It
is a PostgreSQL extension and SQLite has nothing like it, so a portable query carries a depth cap.

## Two columns of state

A recursion does not have to carry one row at a time; it can carry a running pair:

```sql
with recursive fib(a, b) as (select 0, 1 union all select b, a + b from fib where b < 100)
select group_concat(a, ', ') as fibonacci from fib;
```

```text
               fibonacci
---------------------------------------
0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
```

`a` and `b` are the last two values and each step shifts them. The same shape gives a running total or an accumulating balance,
which is the reason a recursive query is occasionally the right tool for something that is not a tree.

## What it costs

A recursive CTE is a loop in the engine rather than a set operation, so the planner has fewer options: each step is a lookup or a
scan for the next level's rows and there is no way to make the whole thing one pass. The two things that make it fast are an index
on the column the step joins on and a base case that selects few rows.

```sql
create index idx_category_parent on category(parent_id);
```

That index is the difference between each level being a lookup and each level being a scan of the whole table. It is the
foreign-key-index rule from the schema chapter arriving through a different door.

## Check yourself

Write a recursive query that lists a category with its full path from the root, and a second that lists a category with its
ancestors. Add a depth column to each and check the depths against the data. Then write the integer series from 1 to 20 and sum
it, and remove the termination condition to see what happens.
