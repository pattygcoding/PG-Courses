---
title: Async in practice
summary: Overlapping waits with Task.WhenAll, bounding concurrency, and where the failures end up.
chapter: Async
minutes: 13
status: draft
---

## Sequential awaits take as long as the sum

```csharp
var first = await FetchAsync("a");
var second = await FetchAsync("b");
var third = await FetchAsync("c");
```

Three calls of one second each take three seconds, because every call waits for the one before it. Starting
them first and awaiting afterwards overlaps the waiting:

```csharp
var results = await Task.WhenAll(
    FetchAsync("a"),
    FetchAsync("b"),
    FetchAsync("c"));
```

`WhenAll` returns when every task has finished and gives the results in argument order, whatever order they
completed in. The same three calls now take about a second.

## Where the failures go

```csharp
try
{
    await Task.WhenAll(tasks);
}
catch (HttpRequestException error)
{
    foreach (var failed in tasks.Where(task => task.IsFaulted))
    {
        Log.Error(failed.Exception, "one call failed");
    }
}
```

`WhenAll` waits for all of them and then rethrows one exception, so the other failures live on the individual
tasks. When every error matters, inspect the tasks rather than trusting the one you caught.

## Bound the concurrency

```csharp
using var gate = new SemaphoreSlim(initialCount: 8);

var tasks = urls.Select(async url =>
{
    await gate.WaitAsync();
    try
    {
        return await FetchAsync(url);
    }
    finally
    {
        gate.Release();
    }
});

var pages = await Task.WhenAll(tasks);
```

Starting ten thousand requests at once exhausts sockets and invites a rate limit. A semaphore with a count you
chose is the smallest fix, and it keeps the code a sequence of tasks rather than a queue with a worker.

## Do not start a task nobody awaits

```csharp
_ = FetchAsync(url);
```

A task that is never awaited can fail with nobody listening, and the process can exit before it finishes its
work. Where work really has to outlive the call, hand it to a queue that a background service drains, so a
failure has somewhere to be reported.

## Check yourself

Fetch three URLs sequentially and then with `Task.WhenAll`, and time both runs. Then make one of them fail and
compare what `WhenAll` throws with what the individual tasks hold.
