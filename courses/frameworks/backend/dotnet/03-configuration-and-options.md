---
title: Configuration and options
summary: Layered settings, the double underscore that binds environment variables, and validation at startup.
chapter: The platform
minutes: 14
status: draft
---

## Sources stack, and the last one wins

```csharp
var builder = WebApplication.CreateBuilder(args);
```

That one call adds `appsettings.json`, `appsettings.{Environment}.json`, environment variables and command line
arguments, in that order. A later source overrides an earlier one, which is why an environment variable beats a
file and a command line flag beats both.

```json
{
  "Checkout": {
    "MaxItems": 20,
    "RequireVerifiedEmail": true
  }
}
```

## Binding a section to a typed object

```csharp
public sealed class CheckoutOptions
{
    public const string SectionName = "Checkout";

    [Range(1, 100)]
    public int MaxItems { get; set; } = 20;

    public bool RequireVerifiedEmail { get; set; }
}
```

```csharp
builder.Services
    .AddOptions<CheckoutOptions>()
    .Bind(builder.Configuration.GetSection(CheckoutOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
```

`ValidateOnStart` is the line that matters. Without it an invalid setting is discovered by the first request that
reads it; with it the process refuses to start and tells you which value is wrong.

## Environment variables use two underscores

```bash
export Checkout__MaxItems=50
export Checkout__RequireVerifiedEmail=false
```

The double underscore stands in for the colon in the configuration path, because a colon is not a legal
character in an environment variable name on every platform. This is the mechanism behind a container's
settings, so it is worth remembering exactly.

## Reading the options

```csharp
app.MapPost("/checkout", (IOptions<CheckoutOptions> options, Order order) =>
{
    if (order.Lines.Count > options.Value.MaxItems)
    {
        return Results.BadRequest("too many items");
    }

    return Results.Ok();
});
```

`IOptions<T>` reads once and is safe for a singleton. `IOptionsSnapshot<T>` re-reads per request, which is what
you want for a setting that can change without a restart, and `IOptionsMonitor<T>` adds a change callback for a
long-lived consumer.

## Secrets are not settings files

A connection string or an API key does not belong in `appsettings.json`, because that file is in source control.
Use user secrets while developing, environment variables or a secret manager in production, and keep the file
for the shape of the configuration rather than the values in it.

```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Shop" "Host=localhost;Database=shop"
```

## Check yourself

Add an options class with a validation attribute, set it from an environment variable with the double underscore
syntax, and then set an invalid value and confirm the process refuses to start with a message naming the
property.
