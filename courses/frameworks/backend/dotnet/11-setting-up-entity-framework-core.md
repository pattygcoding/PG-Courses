---
title: Setting up Entity Framework Core
summary: The context, the provider, the connection string and the migration tool.
chapter: Data
minutes: 13
status: draft
---

## The context is a session with the database

```csharp
public sealed class ShopContext(DbContextOptions<ShopContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Customer> Customers => Set<Customer>();
}
```

A `DbSet<T>` is a queryable collection that is not in memory. Reading from it runs SQL, adding to it stages an
insert, and `SaveChangesAsync` writes everything that is pending.

## Register it with the provider

```csharp
builder.Services.AddDbContext<ShopContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Shop")));
```

`UseNpgsql` comes from the provider package, and the equivalent is `UseSqlServer`, `UseSqlite` or another
provider. `AddDbContext` registers the context as scoped, which gives one context per request and makes change
tracking predictable.

## The connection string does not belong in the file

```json
{
  "ConnectionStrings": {
    "Shop": "Host=localhost;Database=shop;Username=shop"
  }
}
```

Keep the password out of source control and supply it from user secrets in development and from the environment
in production:

```bash
dotnet user-secrets set "ConnectionStrings:Shop" "Host=localhost;Database=shop;Username=shop;Password=secret"
```

## Install the tool once

```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add Initial --project src/Shop
dotnet ef database update --project src/Shop
```

The `dotnet-ef` tool is separate from the provider package, and forgetting it is the usual cause of a
"command not found" in a fresh clone. Add it to your notes for the next machine rather than rediscovering it.

## Where the pool comes from

The provider pools connections, and the thing that exhausts the pool is a context or a transaction left open
across an HTTP call, not the pool settings. Keep the unit of work inside one request and the defaults are fine.

## Background work needs a scope

```csharp
public sealed class CleanupService(IServiceScopeFactory scopes) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = scopes.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ShopContext>();

        await context.Orders.Where(o => o.PlacedAt < cutoff).ExecuteDeleteAsync(stoppingToken);
    }
}
```

A context is scoped, so a singleton service cannot hold one. Creating a scope per unit of work is the pattern,
and `ExecuteDeleteAsync` removes the need to load the rows you are about to delete.

## Check yourself

Create a context with one entity, add the provider, generate the initial migration, apply it, and read the SQL the
migration produced. Then confirm the table exists with a query from a database client.
