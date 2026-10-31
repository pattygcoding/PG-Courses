---
title: Observability
summary: Traces, metrics and correlated logs, and the three questions a production service has to answer.
chapter: Shipping it
minutes: 14
status: draft
---

## Three questions, three signals

| Question                           | Signal                     |
| ---------------------------------- | -------------------------- |
| What happened to this one request? | a trace with its spans     |
| Is the service healthy overall?    | metrics                    |
| What failed, and where?            | logs with a correlation id |

A service that cannot answer all three makes every incident a guess. The three signals are cheap to wire up
together and expensive to add afterwards, because by then the code that needed instrumenting is everywhere.

## Traces, with almost no code

```csharp
builder.Services
    .AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter());
```

Four lines give a span per request, per outgoing HTTP call and per database command, all under one trace id. That
is enough to see that a slow endpoint is slow because of one query rather than the handler, without adding a
single timing statement.

## Metrics for the questions dashboards ask

```csharp
builder.Services
    .AddOpenTelemetry()
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddOtlpExporter());
```

The ASP.NET Core instrumentation gives request rate, duration and error count per route, and the runtime
instrumentation gives the garbage collection and thread pool numbers that explain a service that is slow without
being busy.

## Correlate the logs

```csharp
app.Use(async (context, next) =>
{
    using (LogContext.PushProperty("traceId", Activity.Current?.TraceId.ToString()))
    {
        await next(context);
    }
});
```

Pushing the trace id onto the log scope means every line carries it, so a log store can answer the question a
trace answers. Without it the trace and the logs are two separate stories about the same incident.

## The custom metric worth adding

```csharp
private static readonly Meter Meter = new("Shop");

private static readonly Counter<long> OrdersCreated =
    Meter.CreateCounter<long>("shop.orders.created");

OrdersCreated.Add(1);
```

Business metrics answer the questions a support ticket raises: how many orders, how many failed, for which
customer. A counter defined once and incremented where the event happens costs nothing at run time and is the
first thing anybody asks for during an incident.

## Sampling, and why it matters at scale

Tracing every request is fine at a thousand a day and expensive at a million. Sample a percentage in production,
keep every error, and note that a trace without its downstream spans is worse than no trace because it looks
complete.

## Check yourself

Add tracing and a custom counter to a service, run it with a local collector, and find the span for one slow
request. Then push the trace id onto the log scope and confirm you can find the matching log lines.
