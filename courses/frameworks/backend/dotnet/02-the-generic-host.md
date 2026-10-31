---
title: The generic host and the application lifetime
summary: What starts before your first request, how shutdown works, and where background work belongs.
chapter: The platform
minutes: 13
status: draft
---

## Startup order, in order

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables("SHOP_");
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddHostedService<WarmupService>();

var app = builder.Build();

app.UseExceptionHandler();
app.MapGet("/", () => "ok");

await app.RunAsync();
```

The builder is configured first, then services are registered, then the middleware pipeline is assembled, then
the app runs. A service registered after `Build` is not in the container, which is why the registration calls
all sit above it.

## Background work belongs in a hosted service

```csharp
public sealed class WarmupService(ILogger<WarmupService> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
            log.LogInformation("warmup finished");
        }
        catch (OperationCanceledException)
        {
            log.LogInformation("warmup cancelled");
        }
    }
}
```

```csharp
builder.Services.AddHostedService<WarmupService>();
```

A `BackgroundService` gets a token that is cancelled when the host starts shutting down, so honouring it is what
makes a clean stop possible. Throwing from `ExecuteAsync` before the first await stops the whole host, which is
deliberate: a failed startup is better than a service that limps.

## Shutdown is ordered

On `SIGTERM` the host stops accepting new requests, waits for in-flight ones up to a timeout, cancels every
stopping token, disposes the singletons in reverse registration order, and exits. That timeout defaults to five
seconds for a request; raise it for work that genuinely takes longer, and know that a platform will kill the
process if you raise it too far.

```csharp
builder.Services.Configure<HostOptions>(options =>
{
    options.ShutdownTimeout = TimeSpan.FromSeconds(20);
});
```

## Scoped services in a background loop

```csharp
public sealed class CleanupService(IServiceScopeFactory scopes) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = scopes.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IOrderRepository>();

        await repository.DeleteStaleAsync(stoppingToken);
    }
}
```

A background service is a singleton, so it cannot take a scoped dependency directly. It creates a scope per unit
of work instead, which is the pattern that keeps a database context from living far longer than intended.

## Check yourself

Register a `BackgroundService` that logs once a second, start the app, and stop it with Ctrl+C. Confirm the log
lines stop and that a cancellation message is written by the token you were given.
