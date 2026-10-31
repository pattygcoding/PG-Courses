---
title: Authentication and authorisation
summary: Who the caller is, what they may do, and the query that keeps one customer out of another's data.
chapter: Production concerns
minutes: 14
status: draft
---

## Authenticate, then authorise

```csharp
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"];
        options.Audience = builder.Configuration["Auth:Audience"];
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
```

`UseAuthentication` reads the token and builds the principal. `UseAuthorization` decides whether that principal
may reach the endpoint. Swapping the two leaves authorisation with nobody to authorise, which shows up as a 401
on an endpoint you know has a valid token.

## A policy names an intent

```csharp
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("CanRefund", policy =>
        policy.RequireAuthenticatedUser().RequireClaim("scope", "refunds"));

app.MapPost("/orders/{id:int}/refund", RefundAsync).RequireAuthorization("CanRefund");
```

Because the policy owns the claim, the claim can change without editing every endpoint. Apply it to a group to
cover a whole area at once:

```csharp
var admin = app.MapGroup("/admin").RequireAuthorization("CanRefund");
```

## Reading the caller

```csharp
app.MapGet("/me", (ClaimsPrincipal user) =>
{
    var id = user.FindFirstValue(ClaimTypes.NameIdentifier);

    return id is null ? Results.Unauthorized() : Results.Ok(new { id });
});
```

The framework binds the principal, so it arrives as a parameter. `FindFirstValue` returns null for a claim that is
not present, which is the check to keep rather than assuming the token carried everything.

## Authorisation does not protect a row

A caller may be allowed to reach the endpoint and still be asking for somebody else's record. Ownership is a rule
about data, so it belongs in the query:

```csharp
var order = await context.Orders.FirstOrDefaultAsync(
    order => order.Id == id && order.CustomerId == currentUserId,
    cancellationToken);
```

Filtering in the query is what stops an identifier in the URL from reading another customer's order. Loading by
id and comparing afterwards works until somebody adds a branch and forgets, which is how this becomes a leak.

## Where the token comes from

A service should not issue its own tokens if an identity provider already does. Point `Authority` at the issuer,
let it publish the keys, and verify the audience, so a token minted for another service is rejected here.

## Check yourself

Require authentication on one endpoint and a scope policy on another, call each without a token and with a valid
one, and compare the status codes. Then add an ownership filter and confirm that a second user's id returns a 404
rather than the record.
