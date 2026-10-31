---
title: JSON and content negotiation
summary: The serializer settings worth changing, and how to stream a response that does not fit in memory.
chapter: HTTP with ASP.NET Core
minutes: 12
status: draft
---

## The defaults, and the three worth changing

```csharp
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.WriteIndented = false;
});
```

Camel case on the wire is already the default, so `CustomerEmail` arrives as `customerEmail`. Null suppression is
a real choice: with it, an absent field and a null field look identical to a client, which is often what you want
and occasionally the opposite.

## Naming the contract explicitly

```csharp
public sealed record OrderDto(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] Status Status,
    DateTimeOffset PlacedAt);
```

`JsonPropertyName` makes the wire contract a decision rather than a side effect of renaming a property. Enums
serialise as integers by default, which breaks a client the moment somebody inserts a member in the middle of the
enum, so the string converter is the safer default for anything public.

## Reading a body you did not create

```csharp
app.MapPost("/orders", async (HttpContext context, IOrderService service, CancellationToken token) =>
{
    var request = await context.Request.ReadFromJsonAsync<OrderRequest>(token);

    return request is null
        ? Results.BadRequest("body must be an order object")
        : Results.Ok(await service.CreateAsync(request, token));
});
```

`ReadFromJsonAsync` returns null for a body that is not an object, which is worth handling rather than
dereferencing. Malformed input throws `JsonException`, and the problem details middleware turns that into a 400
that names the position of the error.

## Streaming a large response

```csharp
app.MapGet("/orders/export", async (
    HttpContext context,
    IOrderRepository repository,
    CancellationToken token) =>
{
    context.Response.ContentType = "application/x-ndjson";

    await foreach (var order in repository.StreamAsync(token))
    {
        await context.Response.WriteAsJsonAsync(order, token);
    }
});
```

One JSON object per line, written as each row is read, so a million rows cost one row of memory. A single array
response has to be built whole, which is what makes an export endpoint fall over on a large table.

## Where the boundary types live

Returning an entity straight from the database is the shortcut that turns a schema change into an API change, and
it can leak a field a client should never see. A response record per endpoint costs a few lines and makes the
public contract something you chose.

## Check yourself

Serialise an enum with the default settings and with the string converter and compare the two responses. Then post
a malformed body and read the problem details response the middleware produced.
