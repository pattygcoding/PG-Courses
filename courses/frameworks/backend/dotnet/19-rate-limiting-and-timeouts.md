---
title: Rate limiting and timeouts
summary: A limit that protects the service, and the timeout that frees the thread waiting on a slow dependency.
chapter: Production concerns
minutes: 13
status: draft
---

## Reject rather than queue

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddFixedWindowLimiter("per-tenant", limiter =>
    {
        limiter.PermitLimit = 100;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
});

var app = builder.Build();

app.UseRateLimiter();

app.MapGet("/orders", ListAsync).RequireRateLimiting("per-tenant");
```

`QueueLimit = 0` returns a 429 instead of holding the request, so a burst stays a burst rather than becoming a
slow queue that eventually times out anyway. A queue in front of limited capacity hides the problem it was added
to solve.

## Partition by the caller

A single global limit makes one noisy customer everyone's problem, so the partition key is what the limit is
really about. The built-in limiters take a partition or a key per request:

```csharp
options.AddPolicy("per-key", context =>
    RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Request.Headers["X-Api-Key"].ToString(),
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
        }));
```

Anything identifying the caller works, so long as it cannot be set freely by the caller. A header the client
chooses is a limit the client can reset.

## Time out the cardependency

```csharp
builder.Services.AddHttpClient<IInventoryClient, InventoryClient>(client =>
{
    client.BaseAddress = new Uri("https://inventory.internal");
    client.Timeout = TimeSpan.FromSeconds(3);
});
```

The default timeout on an `HttpClient` is 100 seconds, which means a single slow dependency occupies a thread for
a minute and a half. Three seconds is a decision about how long a user will wait before it is better to fail, and
it belongs next to the client it applies to.

## Time out the whole request

```csharp
builder.Services.AddRequestTimeouts(options =>
{
    options.DefaultPolicy = new RequestTimeoutPolicy
    {
        Timeout = TimeSpan.FromSeconds(10),
    };
});

app.UseRequestTimeouts();
```

A request timeout cancels the token your handler was given, so the work stops rather than finishing into a
connection nobody is holding. That is what turns a stuck dependency into one clean 504 instead of many threads
that linger.

## Check yourself

Add a per-caller limit, exceed it, and read the 429. Then set a client timeout of one second against a dependency
that takes five, and confirm the request fails cleanly instead of hanging.
