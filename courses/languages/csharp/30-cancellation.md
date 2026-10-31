---
title: Cancellation
summary: CancellationToken as a cooperative contract, and the timeout that actually stops the work.
chapter: Async
minutes: 12
status: draft
---

## The token travels down the chain

```csharp
public async Task<string> FetchAsync(string url, CancellationToken cancellationToken)
{
    using var response = await _http.GetAsync(url, cancellationToken);
    return await response.Content.ReadAsStringAsync(cancellationToken);
}
```

A token is a request to stop rather than an instruction: the operation stops at the next point that checks.
Passing it to every call that accepts one is what makes cancellation work through the whole stack, and it costs
one parameter per method. An API that does not take a token cannot be cancelled, however hard its caller tries.

## Code that does its own work has to check

```csharp
foreach (var row in rows)
{
    cancellationToken.ThrowIfCancellationRequested();
    await ProcessAsync(row, cancellationToken);
}
```

Anything that accepts a token checks internally, so the explicit call is for the loops and the long stretches
of work in between.

## Timeouts are built on a token

```csharp
using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));

try
{
    return await FetchAsync(url, timeout.Token);
}
catch (OperationCanceledException) when (timeout.IsCancellationRequested)
{
    throw new TimeoutException($"no response from {url} within five seconds");
}
```

Each request gets its own source, so one slow call cannot cancel the next. When the caller also passes a token,
link the two so both paths work:

```csharp
using var linked = CancellationTokenSource.CreateLinkedTokenSource(callerToken);
linked.CancelAfter(TimeSpan.FromSeconds(5));
```

## Cancellation is not a failure

```csharp
catch (OperationCanceledException) when (callerToken.IsCancellationRequested)
{
    // the caller asked us to stop
}
```

A cancelled operation and a real failure arrive as the same exception type, so the filter says which happened.
Logging a cancellation as an error fills the log with events nobody can act on, which hides the failures that
matter.

## Check yourself

Add a token to a method that loops over rows, cancel it from the caller after a short delay, and confirm the
loop stops. Then link a timeout to the same token and confirm both paths still cancel.
