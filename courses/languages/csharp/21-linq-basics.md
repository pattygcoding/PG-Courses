---
title: LINQ basics
summary: Where, Select and OrderBy, the deferred execution that surprises people, and the five methods that answer most questions.
chapter: The standard library
minutes: 13
status: draft
---

## A query is a chain of calls

```csharp
var names = orders
    .Where(order => order.Total > 100m)
    .OrderByDescending(order => order.Total)
    .Select(order => order.Customer)
    .ToList();
```

Read it as the sentence it describes: take the orders, keep the large ones, sort by total, project the
customer, and materialise. Each call returns a sequence, so the chain stays a chain until something forces it
to run.

## Deferred execution

```csharp
var query = orders.Where(order => order.Total > 100m);

foreach (var order in query) { }
var count = query.Count();
```

Nothing runs on the first line. It builds a description of the work, and each enumeration performs it again,
so the filter runs twice above and a change to `orders` in between is visible. Calling `ToList` when you want
the answer once is the habit that avoids the confusion:

```csharp
var big = orders.Where(order => order.Total > 100m).ToList();
```

## Five methods that answer most questions

```csharp
orders.Any(order => order.Total > 100m)
orders.All(order => order.Total >= 0)
orders.First(order => order.Total > 100m)
orders.FirstOrDefault(order => order.Total > 1000m)
orders.Sum(order => order.Total)
```

`Any` stops at the first match, so it is the cheapest way to ask whether something exists. `First` throws
when nothing matches and `FirstOrDefault` returns a default, which is the choice between a bug you want to
hear about and a case you intend to handle. `Single` is the strictest and throws when more than one matches.

## Projecting into a shape

```csharp
var summary = orders
    .GroupBy(order => order.Customer)
    .Select(group => new
    {
        Customer = group.Key,
        Orders = group.Count(),
        Total = group.Sum(order => order.Total),
    })
    .ToList();
```

`GroupBy` with a projection into an anonymous type is the shape behind most reports. The anonymous type is
scoped to the method, which suits a projection nobody else needs and is wrong for anything that leaves it.

## Check yourself

Rewrite a loop that filters, sorts and projects as a LINQ chain. Then call `Count()` on the chain and on a
`ToList` of it, and explain why one of those does the work twice.
