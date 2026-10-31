---
title: Real dependencies in tests
summary: A containerised database, the schema it needs, and when a fake stops being enough.
chapter: Testing the service
minutes: 13
status: draft
---

## A fake proves your code, not your SQL

A fake repository proves the handler calls the method you expected. It cannot prove the query runs, the index is
used, the constraint holds or the migration applies, because the fake has none of those. When the risk lives in
the database interaction, the test needs a database.

## One container per suite

```csharp
public sealed class DatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container =
        new PostgreSqlBuilder().WithImage("postgres:16-alpine").Build();

    public string ConnectionString => _container.GetConnectionString();

    public Task InitializeAsync() => _container.StartAsync();

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}
```

The container starts once for the fixture and is removed at the end, so the suite needs a container runtime and
nothing else. Start it in a fixture rather than per test, because a container per test adds seconds each time.

## Point the app at it

```csharp
using var factory = new WebApplicationFactory<Program>()
    .WithWebHostBuilder(builder =>
        builder.UseSetting("ConnectionStrings:Shop", database.ConnectionString));
```

Overriding one setting is enough, and that only works because the connection string is configuration rather than
a constant. This is the payoff for the configuration lesson: a test can redirect the app at a throwaway database
without a code change.

## Apply the schema before the tests

```csharp
await using var context = new ShopContext(options);
await context.Database.MigrateAsync();
```

Running migrations in the fixture means every test starts from the same schema, and a broken migration fails the
build rather than production. Do it once per run, not once per test.

## Where the line belongs

A pricing rule deserves a unit test that runs in a millisecond. The query that loads an order, the constraint that
stops a duplicate and the migration that adds a column deserve a real database. A suite where every test starts a
container is a suite people stop running, so keep this for the tests that cannot be honest without it.

## Check yourself

Start a Postgres container from a fixture, apply migrations, and write one test that inserts and reads a row. Then
stop the container and confirm the failure names the connection rather than hanging.
