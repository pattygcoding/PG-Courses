---
title: Self-joins and hierarchies
summary: One table joined to itself, the tree it can hold, and the sibling query that needs a tiebreaker.
chapter: Joining tables
minutes: 12
status: draft
---

## A table can be joined to itself

```sql
create table category(
  id integer primary key,
  name text not null,
  parent_id integer references category(id)
) strict;
```

`category.parent_id` points at `category.id`, so the table holds a tree: Fiction has Science fiction and Fantasy under it, and
Science fiction has Space opera. The query that reads it joins the table to itself with two aliases:

```sql
select c.name as category, p.name as parent
from category as c left join category as p on p.id = c.parent_id
order by coalesce(p.name, ''), c.name;
```

```text
   category          parent
---------------  ---------------
Fiction
Non-fiction
Fantasy          Fiction
Science fiction  Fiction
Essays           Non-fiction
Space opera      Science fiction
```

Two aliases for one table are what makes a self-join possible, and they are not optional: without them there is no way to say
which copy a column belongs to. The `LEFT JOIN` is what keeps the roots, because a category with no parent matches no row.

An inner self-join is the query for "has a parent", and it is how a count of children per parent is written:

```sql
select parent.name as parent, count(*) as children
from category as c join category as parent on parent.id = c.parent_id
group by parent.id order by children desc;
```

```text
    parent       children
---------------  --------
Fiction                 2
Non-fiction             1
Science fiction         1
```

## Comparing rows to each other

The other use of a self-join is comparing rows within a table, and then the important detail is the condition that stops each
pair being counted twice:

```sql
select c1.name as a, c2.name as b
from category as c1 join category as c2 on c1.parent_id = c2.parent_id and c1.id < c2.id;
```

```text
       a            b
---------------  -------
Science fiction  Fantasy
```

That finds pairs of siblings and returns each pair once, because `c1.id < c2.id` means the query only sees one of the two
orders. Matches with `<>` instead of `<` would return the pair twice, once in each direction, and `<>` with itself excluded is
the usual way a "find the duplicate pairs" query goes wrong.

The pattern generalises:

```sql
select a.id as id_a, b.id as id_b
from member as a join member as b on a.name = b.name and a.id < b.id;
```

That is how duplicate rows are found when a `UNIQUE` constraint was not there to prevent them. On a table of any size it is
quadratic unless the column is indexed, and chapter eight covers what to do about that.

## A self-join is a one-level view of a tree

A second self-join reaches the level above that, and each extra level needs another one:

```sql
select c.name as category, p.name as parent, g.name as grandparent
from category as c
left join category as p on p.id = c.parent_id
left join category as g on g.id = p.parent_id
order by c.name;
```

```text
   category          parent       grandparent
---------------  ---------------  -----------
Essays           Non-fiction
Fantasy          Fiction
Fiction
Non-fiction
Science fiction  Fiction
Space opera      Science fiction  Fiction
```

The query above returns every category and its parent, and that is as far as a self-join goes: one level. Space opera's parent is
Science fiction and the parent of that is Fiction, and no number of extra joins gets the whole path without knowing the depth in
advance. A tree of unknown depth needs a recursive query, which chapter nine covers:

```sql
with recursive tree(id, name, depth) as (
  select id, name, 0 from category where parent_id is null
  union all
  select c.id, c.name, t.depth + 1 from category as c join tree as t on t.id = c.parent_id
)
select name, depth from tree order by depth, name;
```

That is the query this page's self-join was standing in for, and the difference is the point: a self-join is a fixed number of
levels and a recursive common table expression is any number.

## Where the hierarchy shape belongs

A `parent_id` column is the adjacency list, and it is the right default because it is one column, it costs one index and any
row can be updated without touching another. Its weakness is exactly the depth problem above, and the alternatives are a
materialised path (`'/1/2/4/'` in a column, which makes subtree queries a `LIKE` and a move query expensive) or a closure
table (one row per ancestor-descendant pair, which makes reads easy and writes expensive).

For a category tree of a few hundred rows, I use the adjacency list and a recursive query. For a tree where a subtree query
runs constantly on a large table, a closure table earns its complexity. Choosing between them is about which operation happens
most, and there is no answer that is best at all of them.

## Check yourself

Create the category table with two levels of nesting and list every category with its parent. Count the children per parent.
Then find the pairs of siblings with a self-join and explain what `c1.id < c2.id` prevents. Finish by writing the recursive
query for a category's full path from the root.
