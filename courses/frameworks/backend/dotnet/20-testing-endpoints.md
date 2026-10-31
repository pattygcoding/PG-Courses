---
title: Testing endpoints
summary: WebApplicationFactory, the in-memory server, and the test that goes through the real pipeline.
chapter: Testing the service
minutes: 14
status: draft
---

## The factory boots your app

```csharp
public sealed class OrdersApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_returns_not_found_for_an_unknown_id()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/orders/9999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

`WebApplicationFactory<TEntryPoint>` starts the real pipeline in memory, so routing, middleware, model binding and
serialisation are all exercised without a socket or a port. The entry point has to be visible to the test
assembly, which one line in `Program.cs` achieves:

```csharp
public partial class Program;
```

## One change on top of the real app

```csharp
var client = factory
    .WithWebHostBuilder(builder =>
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOrderRepository>();
            services.AddSingleton<IOrderRepository, InMemoryOrderRepository>();
        });
    })
    .CreateClient();
```

`WithWebHostBuilder` returns a factory with a single difference, so the base factory stays available for the tests
that want the real database. Replacing one dependency keeps the test fast while the whole HTTP path stays
covered.

## Assert on the contract, not the handler

```csharp
var response = await client.PostAsJsonAsync("/orders", request);

Assert.Equal(HttpStatusCode.Created, response.StatusCode);

var created = await response.Content.ReadFromJsonAsync<OrderDto>();
Assert.Equal("ada@example.com", created!.CustomerEmail);
```

Calling the service method directly would skip binding, validation and status codes, which are the parts most
likely to be wrong. This shape catches a missing validation attribute and a changed route, and it runs in
milliseconds.

## What belongs in the suite

One test per endpoint for the happy path, one per validation failure, and one per status code the endpoint can
return. That covers the contract a client depends on. The edge cases in the logic behind the endpoint belong in
unit tests with a fake repository, where they are cheaper to write and to run.

## Check yourself

Write an integration test that posts a valid body and reads it back, and one that posts an invalid body and
asserts a 400. Replace the repository with a fake and confirm both still pass without a database.
