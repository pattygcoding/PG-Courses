---
title: Error handling and problem details
summary: One place that turns an exception into a response, and the shape a client expects back.
chapter: HTTP with ASP.NET Core
minutes: 13
status: draft
---

## One registration and two calls

```csharp
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
```

`AddProblemDetails` registers the RFC 9457 response shape, `UseExceptionHandler` converts an unhandled exception
into it without leaking a stack trace, and `UseStatusCodePages` gives a bare 404 from the pipeline the same shape.
Three lines, and every error the service can produce looks the same to a client.

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "quantity must be at least 1",
  "traceId": "00-6a1e0f2b9d4c7a51-3f2b7c1e9a4d6f80-01"
}
```

The `traceId` is the part worth using: it joins the response a user pasted into a ticket to the log line and the
distributed trace that produced it.

## A handler for one domain exception

```csharp
public sealed class PricingExceptionHandler(ILogger<PricingExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not PricingException pricing)
        {
            return false;
        }

        log.LogWarning(pricing, "pricing failed for {Sku}", pricing.Sku);

        context.Response.StatusCode = StatusCodes.Status409Conflict;
        await context.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Pricing failed",
                Detail = pricing.Message,
            },
            cancellationToken);

        return true;
    }
}
```

```csharp
builder.Services.AddExceptionHandler<PricingExceptionHandler>();
```

Returning `false` passes the exception along, so registering a specific handler before the general one keeps the
domain error's status code while an unexpected bug still becomes a 500.

## Errors a client causes are results, not exceptions

```csharp
if (order is null)
{
    return Results.NotFound();
}

if (request.Quantity < 1)
{
    return Results.ValidationProblem(new Dictionary<string, string[]>
    {
        ["quantity"] = ["must be at least 1"],
    });
}
```

A missing record and an invalid field are ordinary outcomes, so they return a result. Exceptions are for the
states a caller cannot produce, which is what keeps the log worth reading.

## Do not leak the internals

An exception message from a database driver names tables, and a stack trace names files and line numbers. Both
are useful in development and both are information a stranger can use in production, which is why the environment
decides how much of the exception reaches the response.

## Check yourself

Throw from an endpoint in Development and in Production and compare the two responses. Then add a handler for one
domain exception and confirm it returns its own status code while an unexpected exception still returns a 500.
