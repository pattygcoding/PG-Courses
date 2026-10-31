---
title: Routing and route templates
summary: Constraints, optional and catch-all segments, and how the router chooses a handler.
chapter: HTTP with ASP.NET Core
minutes: 12
status: draft
---

## The template describes the URL

```csharp
app.MapGet("/orders/{id:int}", FindAsync);
app.MapGet("/orders/{slug:alpha}", FindBySlugAsync);
app.MapGet("/reports/{year:int}/{month:int?}", ReportAsync);
app.MapGet("/files/{**path}", DownloadAsync);
```

The constraint after the colon decides what is a valid value. `/orders/abc` never reaches the handler that wants
an `int`, because the route does not match and the pipeline returns a 404 without your code running. A trailing
`?` makes a segment optional, and a double star captures the rest of the path including slashes.

## The constraints worth knowing

| Constraint                                   | Matches                      |
| -------------------------------------------- | ---------------------------- |
| `int`, `long`, `bool`, `decimal`             | that type                    |
| `guid`                                       | a GUID                       |
| `datetime`                                   | a parseable date             |
| `length(8)`, `minlength(3)`, `maxlength(20)` | a string length              |
| `alpha`, `regex(...)`                        | letters, or a pattern        |
| `range(1,100)`                               | a bounded number             |
| `required`                                   | a value that must be present |

They are a whitelist rather than validation. Use them to keep nonsense out of the handler, and keep the business
rules in the handler where they can return a useful message.

## Route names and link generation

```csharp
orders.MapGet("/{id:int}", FindAsync).WithName("FindOrder");

app.MapPost("/orders", (LinkGenerator links, Order order) =>
{
    var location = links.GetPathByName("FindOrder", new { id = order.Id });

    return Results.Created(location, order);
});
```

Naming a route and generating its URL from the name means the path appears once in the code, so changing the
template cannot leave a stale hard-coded string in a `Location` header.

## Matching is by precedence, not by registration order

The router scores candidates and prefers a literal segment over a parameter, so `/orders/recent` wins over
`/orders/{id}` for the URL `/orders/recent` whatever order the two are registered in. Two templates that can both
match the same URL are a design problem rather than a registration-order problem, and the request fails with an
ambiguity error when it reaches them.

## Check yourself

Add a route with an `int` constraint, call it with a non-numeric value, and read the 404. Then add a literal route
that overlaps a parameter route and confirm the literal one wins.
