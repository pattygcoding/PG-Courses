---
title: Dependency injection
summary: The container the host builds, the three lifetimes, and the mistake each one prevents.
chapter: The platform
minutes: 14
status: draft
---

## Registration and resolution

```csharp
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddTransient<IEmailSender, SmtpEmailSender>();
```

Register an interface against an implementation, then ask for the interface in a constructor or an endpoint
parameter. The container builds the graph, so a class never constructs its own dependencies and a test can
replace any of them.

## The three lifetimes

| Lifetime  | Created                    | Use it for                                        |
| --------- | -------------------------- | ------------------------------------------------- |
| Singleton | once per application       | configuration, caches, a clock, stateless helpers |
| Scoped    | once per request or scope  | a database context, a unit of work                |
| Transient | every time it is asked for | lightweight stateless services                    |

The rule that follows from the table: a singleton must never take a scoped dependency. Doing so captures one
scope's object and hands it to every later request, which is the captive dependency bug and shows up as a
database context used from two threads.

```csharp
builder.Services.AddSingleton<IOrderRepository, OrderRepository>();
```

That line is a warning sign, because a repository almost always depends on a database context, which is scoped.

## Validate the registrations at startup

```csharp
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.Services.GetRequiredService<IOrderService>();
}
```

Building the graph once during startup fails the process if a dependency is missing, instead of failing the
first request that needs it. `ValidateOnBuild` and `ValidateScopes` do the same check automatically, and both
are on by default in the Development environment.

```csharp
builder.Host.UseDefaultServiceProvider(options =>
{
    options.ValidateScopes = true;
    options.ValidateOnBuild = true;
});
```

## Constructor injection, and its cost

```csharp
public sealed class OrderService(
    IOrderRepository repository,
    IClock clock,
    ILogger<OrderService> log)
{
    public async Task<Order> CreateAsync(OrderRequest request, CancellationToken cancellationToken)
    {
        var order = new Order(request, clock.UtcNow);
        await repository.AddAsync(order, cancellationToken);
        log.LogInformation("created order {Id}", order.Id);
        return order;
    }
}
```

A primary constructor keeps the noise down. A constructor with eight parameters is a signal that the class does
too much, and the container will happily inject all eight rather than telling you.

## Check yourself

Register a service at each lifetime, take each one into an endpoint, and log the object's hash code. Then change
a scoped registration to a singleton and write down what the hash code output would become.
