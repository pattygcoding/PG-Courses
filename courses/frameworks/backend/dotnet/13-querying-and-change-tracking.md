---
title: Querying and change tracking
summary: LINQ that becomes SQL, projections that avoid loading, and the include that turns into an N+1.
chapter: Data
minutes: 14
status: draft
---

## A query is translated to SQL

```csharp
var recent = await context.Orders
    .Where(order => order.PlacedAt > cutoff)
    .OrderByDescending(order => order.PlacedAt)
    .Take(20)
    .ToListAsync(cancellationToken);
```

```sql
SELECT o."Id", o."CustomerEmail", o."PlacedAt"
FROM "Orders" AS o
WHERE o."PlacedAt" > @cutoff
ORDER BY o."PlacedAt" DESC
LIMIT 20
```

Only calls the provider can translate reach the database, and anything else throws rather than quietly loading a
whole table. `ToQueryString()` prints the SQL for a query without running it, which is the fastest way to check
what you actually asked for.

## Project rather than load

```csharp
var rows = await context.Orders
    .Select(order => new OrderSummary(order.Id, order.CustomerEmail, order.Lines.Count))
    .ToListAsync(cancellationToken);
```

A projection selects the columns the caller needs, so a wide table does not travel and the context tracks
nothing. For a read of whole entities, `AsNoTracking()` is the cheaper option, and it is safe whenever the objects
will not be changed.

## The include that is not there

```csharp
var orders = await context.Orders.Take(20).ToListAsync(cancellationToken);

foreach (var order in orders)
{
    Console.WriteLine(order.Lines.Count);   // 0, every time
}
```

Lazy loading is off by default, so a collection that was not included stays empty. Nothing throws, and the empty
list looks like real data, which is the worst kind of wrong. Two ways to load it:

```csharp
var orders = await context.Orders
    .Include(order => order.Lines)
    .Take(20)
    .ToListAsync(cancellationToken);

var projected = await context.Orders
    .Select(order => new { order.Id, LineCount = order.Lines.Count })
    .Take(20)
    .ToListAsync(cancellationToken);
```

## Several collections need a split query

```csharp
var orders = await context.Orders
    .Include(order => order.Lines)
    .Include(order => order.Payments)
    .AsSplitQuery()
    .ToListAsync(cancellationToken);
```

Two includes in one query produce a cartesian product, where twenty orders with twenty lines and twenty payments
return eight thousand rows. `AsSplitQuery` issues one query per collection instead, which trades a round trip for
far less data.

## Lazy loading turns a mistake into a slow page

Installing `Microsoft.EntityFrameworkCore.Proxies` and calling `UseLazyLoadingProxies` makes an unloaded
collection load on first access, so the loop above fires twenty queries instead of showing zeroes. It turns a
visible bug into an invisible performance problem, which is a good reason to leave it off.

## Check yourself

Query a parent and a child collection with `Include`, then with a projection, and compare the SQL from
`ToQueryString`. Then add a second include and see what `AsSplitQuery` changes.
