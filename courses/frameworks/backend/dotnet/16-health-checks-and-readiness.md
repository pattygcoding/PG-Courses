---
title: Health checks and readiness
summary: Liveness against readiness, what is worth checking, and what a failing probe should mean.
chapter: Production concerns
minutes: 11
status: draft
---

## Two questions, two endpoints

```csharp
builder.Services
    .AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddDbContextCheck<ShopContext>("database", tags: ["ready"]);

var app = builder.Build();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live"),
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
});
```

Liveness answers whether the process should be restarted, so it must not touch a dependency: a database outage
is not a reason to restart a service that is working. Readiness answers whether this instance should receive
traffic, so it checks everything the service cannot serve without.

## What is worth checking

Check the things whose absence makes the service useless, which usually means the database and any required
queue. Do not check a third party you can degrade without, because its outage would remove your healthy instances
from the load balancer and turn a partial problem into a full one.

## Make the response readable

```csharp
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse,
});
```

The default body is the single word `Healthy`, which is fine for a probe and useless for a person reading it. The
UI response writer returns JSON naming each check, so a failing probe says which dependency was down.

## Startup, when initialisation is slow

```csharp
app.MapHealthChecks("/health/startup", new HealthCheckOptions
{
    Predicate = _ => false,
});
```

An empty predicate registers no checks, so the endpoint answers as soon as the process is listening. That is what
a platform polls while the app is still warming up, before it starts asking the readiness question.

## Probes cause outages too

A readiness check that runs a heavy query on every poll adds load proportional to the poll rate. Keep each check
cheap, and prefer a `SELECT 1` over counting a table.

## Check yourself

Add a liveness and a readiness endpoint, stop the database, and confirm the service stays up while readiness
fails. Then read both responses and check that the failure names the dependency.
