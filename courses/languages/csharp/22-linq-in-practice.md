---
title: LINQ in practice
summary: Joins, lookups, SelectMany and batching, and when a loop says it better.
chapter: The standard library
minutes: 13
status: draft
---

## Join instead of a nested loop

```csharp
var rows = orders.Join(
    customers,
    order => order.CustomerId,
    customer => customer.Id,
    (order, customer) => new { order.Id, customer.Name });
```

The arguments are the inner sequence, the two key selectors and what to produce from each pair. The loop it
replaces is a nested `foreach` with a lookup inside, which is the same work written less clearly.

For a one-to-many lookup, build the index once and read it many times:

```csharp
var byCustomer = orders.ToLookup(order => order.CustomerId);

foreach (var customer in customers)
{
    foreach (var order in byCustomer[customer.Id]) { }
}
```

`ToLookup` returns an empty sequence for a key that has no matches, where a `Dictionary` would throw. That is
what a report wants, and it is the reason `GroupBy` and `ToLookup` exist side by side.

## Grouping and aggregating

```csharp
var perDay = orders
    .GroupBy(order => order.PlacedOn.Date)
    .Select(group => new
    {
        Day = group.Key,
        Count = group.Count(),
        Total = group.Sum(order => order.Total),
    })
    .OrderBy(row => row.Day)
    .ToList();
```

`group.Key` is the value you grouped by, and the group is itself a sequence, so the aggregates nest.

## SelectMany flattens a level

```csharp
var topItems = orders
    .SelectMany(order => order.Lines)
    .GroupBy(line => line.Sku)
    .Select(group => new { Sku = group.Key, Quantity = group.Sum(line => line.Quantity) })
    .OrderByDescending(row => row.Quantity)
    .Take(5)
    .ToList();
```

`SelectMany` turns a sequence of sequences into one sequence, and the loop it replaces is always a nested one.

## Chunk for batching

```csharp
foreach (var batch in rows.Chunk(500))
{
    Save(batch);
}
```

`Chunk` splits the source into fixed-size arrays, added in .NET 6. Before that everyone wrote the same
`Skip`/`Take` loop, which is quadratic on a list because `Skip` walks.

## When a loop says it better

A chain is readable while each step is one call and the goal is clear. It stops being readable when the steps
carry side effects, when it runs past five calls, or when it needs the index. A `foreach` with a good variable
name beats a chain you have to read twice, and the measured difference is rarely the reason either way.

## Check yourself

Take a nested loop you have written and rewrite it with `SelectMany` plus a `ToLookup`. Then find a chain in
your code longer than five calls and split it into two named queries.
