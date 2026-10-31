---
title: The request pipeline
summary: Middleware, the order that matters, and the short circuit that ends a request early.
chapter: HTTP with ASP.NET Core
minutes: 13
status: draft
---

## The order is the framework's, not yours

```csharp
var app = builder.Build();

app.UseExceptionHandler();
app.UseHsts();
app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapGet("/", () => "ok");

app.Run();
```

Exception handling goes outermost so it catches everything inside it. Protocol concerns come next. Routing then
identity then authorisation, in that order, because authorisation needs to know who the caller is. Endpoints go
last. Getting this wrong produces a symptom rather than an error: an exception that escapes the handler, or a
401 where you expected a 403.

## Middleware is a function around the rest of the chain

```csharp
app.Use(async (context, next) =>
{
    var started = Stopwatch.GetTimestamp();

    await next(context);

    var elapsed = Stopwatch.GetElapsedTime(started);
    context.Response.Headers["Server-Timing"] = $"app;dur={elapsed.TotalMilliseconds:F1}";
});
```

Code before `await next(context)` runs on the way in and code after it runs on the way out, so a middleware can
measure, log or rewrite both directions. Not calling `next` ends the request there, which is how a short circuit
works.

## A short circuit for one area

```csharp
app.UseWhen(
    context => context.Request.Path.StartsWithSegments("/internal"),
    branch => branch.Use(async (context, next) =>
    {
        if (!context.Request.Headers.ContainsKey("X-Internal-Key"))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        await next(context);
    }));
```

`UseWhen` forks the pipeline for a path and rejoins it, which keeps a rule for one area out of the main chain.

## What does not belong in middleware

Reading the whole request body, resolving a scoped service into a singleton, and work only some endpoints need,
all belong elsewhere. Middleware runs for every request, so a slow middleware slows the whole service, and a
bug in one is a bug in all of them.

## Check yourself

Add middleware that writes the request duration into a response header, then add one that rejects a request
without a particular header. Confirm with `curl -i` that both ran, that the order is what you expected, and that
the rejection skipped the endpoint.
