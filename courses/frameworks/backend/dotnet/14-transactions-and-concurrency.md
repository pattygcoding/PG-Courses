---
title: Transactions and concurrency
summary: One unit of work per request, a row version that catches lost updates, and the external call that must not sit inside a transaction.
chapter: Data
minutes: 14
status: draft
---

## SaveChanges is already a transaction

```csharp
context.Orders.Add(order);
context.Lines.AddRange(order.Lines);

await context.SaveChangesAsync(cancellationToken);
```

Every pending change goes in one transaction, so either all of it lands or none of it does. A unit of work that
fits in one save needs no explicit transaction, and adding one is a line you have to maintain for nothing.

## An explicit transaction for several steps

```csharp
await using var transaction =
    await context.Database.BeginTransactionAsync(cancellationToken);

context.Orders.Add(order);
await context.SaveChangesAsync(cancellationToken);

await otherWorkAsync(cancellationToken);

await transaction.CommitAsync(cancellationToken);
```

Be careful what `otherWorkAsync` does. An HTTP call inside a transaction holds the row locks for as long as the
other service takes, so a slow dependency becomes a lock on your table. Where the two must be consistent, write
the intent in the same transaction and act on it afterwards, which is the outbox pattern.

## Lost updates, and the fix

```csharp
public sealed class Order
{
    public int Id { get; set; }
    public decimal Total { get; set; }
    public uint Version { get; set; }
}
```

```csharp
modelBuilder.Entity<Order>().Property(order => order.Version).IsRowVersion();
```

Two requests read the same row, both change it, both save, and the second overwrites the first with nothing
reported. A row version adds a version column to the `WHERE` clause, so the second save matches no rows and
throws:

```csharp
catch (DbUpdateConcurrencyException)
{
    return Results.Conflict("the order changed while you were editing it");
}
```

`IsRowVersion` maps to the provider's native mechanism, which is a row version column on SQL Server and the
system column `xmin` on PostgreSQL. The behaviour is the same either way.

## Update without loading

```csharp
var updated = await context.Orders
    .Where(order => order.PlacedAt < cutoff)
    .ExecuteUpdateAsync(
        setters => setters.SetProperty(order => order.Status, Status.Archived),
        cancellationToken);
```

`ExecuteUpdateAsync` and `ExecuteDeleteAsync` run one statement and skip change tracking, which is what a bulk
change wants. The cost is that the context's tracked entities do not know what happened, so use them for work
that finishes the request.

## Check yourself

Update the same row from two contexts and confirm one of the saves throws. Then run a bulk update with
`ExecuteUpdateAsync` and compare the rows affected with what you expected.
