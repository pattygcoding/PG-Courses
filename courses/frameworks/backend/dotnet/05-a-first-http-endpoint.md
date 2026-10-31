---
title: A first HTTP endpoint
summary: Minimal APIs, typed results, route groups and the shape of a handler.
chapter: HTTP with ASP.NET Core
minutes: 13
status: draft
---

## A handler is a lambda with types

```csharp
var app = builder.Build();

app.MapGet("/orders/{id:int}", async (
    int id,
    IOrderRepository repository,
    CancellationToken cancellationToken) =>
{
    var order = await repository.FindAsync(id, cancellationToken);

    return order is null
        ? Results.NotFound()
        : Results.Ok(order);
});

app.Run();
```

The route template says `id` is an `int`, so a request with `/orders/abc` never reaches the handler. The
repository comes from the container, and the token is cancelled when the client disconnects, which is the
cheapest way to stop work nobody is waiting for.

## Results carry the status code

```csharp
app.MapPost("/orders", async (OrderRequest request, IOrderService service, CancellationToken token) =>
{
    var result = await service.CreateAsync(request, token);

    return result switch
    {
        { IsValid: true } => Results.Created($"/orders/{result.Order!.Id}", result.Order),
        { Errors: var errors } => Results.ValidationProblem(errors),
        _ => Results.Problem("could not create the order"),
    };
});
```

`Results` covers the status codes you need, and returning a specific one is clearer than setting a property and
hoping. `Results.Created` includes the `Location` header, which is what a client uses to read back what it
just created.

## Grouping endpoints that share a prefix

```csharp
var orders = app.MapGroup("/orders").WithTags("Orders");

orders.MapGet("/", ListAsync);
orders.MapGet("/{id:int}", FindAsync);
orders.MapPost("/", CreateAsync);
orders.MapDelete("/{id:int}", DeleteAsync);
```

A group keeps the prefix, the tags and any filters in one place, and it means the routes read as the resource
they belong to. Splitting the handlers into a static class keeps `Program.cs` short as the service grows.

## The endpoint metadata that shows up in tooling

```csharp
orders.MapGet("/{id:int}", FindAsync)
    .Produces<Order>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status404NotFound)
    .WithName("FindOrder");
```

`Produces` describes what the endpoint returns, which feeds the OpenAPI document that your API documentation and
your generated clients are built from. `WithName` gives the route a stable name for links.

## Check yourself

Write three endpoints for one resource: list, find by id and create. Return a 404 for a missing id and a 201
with a location for a create, and check both with `curl -i`.
