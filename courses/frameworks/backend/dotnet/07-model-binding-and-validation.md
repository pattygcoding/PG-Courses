---
title: Model binding and validation
summary: Where each part of a request comes from, and the validation that runs before the handler.
chapter: HTTP with ASP.NET Core
minutes: 14
status: draft
---

## Saying where the data comes from

```csharp
app.MapPost("/orders", (
    [FromBody] OrderRequest body,
    [FromQuery] int page,
    [FromHeader(Name = "X-Tenant")] string tenant,
    [FromRoute] int version) =>
{
    return Results.Ok(new { body, page, tenant, version });
});
```

By default a simple type binds from the route and a complex type from the body, which is a rule worth not having
to remember. Naming the source turns a silently empty object into a clear error when a client posts a form
where JSON was expected.

## The contract carries the validation

```csharp
public sealed record OrderRequest(
    [property: Required, MinLength(1)] IReadOnlyList<LineRequest> Lines,
    [property: EmailAddress] string CustomerEmail);

public sealed record LineRequest(
    [property: Required] string Sku,
    [property: Range(0.01, 100000)] decimal UnitPrice);
```

`Required`, `MinLength`, `Range`, `EmailAddress`, `RegularExpression` and `StringLength` come from
`System.ComponentModel.DataAnnotations` and need no package. Putting them on the request contract keeps the rules
next to the shape they describe, and the same contract can be reused by the client that builds the request.

## Controllers validate for you

```csharp
[ApiController]
[Route("orders")]
public sealed class OrdersController(IOrderService service) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<Order>> Create(OrderRequest request, CancellationToken token)
    {
        return await service.CreateAsync(request, token);
    }
}
```

`[ApiController]` makes a failed validation return a 400 problem details response without any check in the
method, and `ModelState` holds the errors if you want to shape the response yourself. That automatic step is the
main reason to choose controllers for an API with a lot of input shapes.

## Minimal APIs need one line or one filter

```csharp
public sealed class ValidationFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        foreach (var argument in context.Arguments)
        {
            if (argument is null || !HasErrors(argument, out var errors))
            {
                continue;
            }

            return Results.ValidationProblem(errors);
        }

        return await next(context);
    }
}
```

Register it once with `.AddEndpointFilter<ValidationFilter>()` on a route group and every endpoint in the group
validates before its handler runs.

## Validate the shape, not the business rules

Attaching a range to a quantity is a shape rule. Whether the customer may order that item at all is a business
rule, and it belongs in the service where it can look up the data it needs. Mixing the two puts a database call
inside an attribute, which is the point where validation stops being cheap.

## Check yourself

Post a body with a missing required field and an invalid email, and read the 400 response. Then move one rule out
of the contract into the service and explain why that rule needed the service.
