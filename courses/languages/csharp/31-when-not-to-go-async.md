---
title: When not to reach for async
summary: CPU work, synchronous APIs, and the parallel loop that has nothing to do with tasks.
chapter: Async
minutes: 11
status: draft
---

## Async helps waiting, and only waiting

```csharp
public async Task<int> SumAsync(int[] values)
{
    await Task.Yield();
    return values.Sum();
}
```

That method adds a state machine and a thread hop to work that never waited, so it is slower than the
synchronous version and no more concurrent. Summing an array is CPU work, and the fix for slow CPU work is a
better algorithm or a second core.

## Do not wrap a fast call in Task.Run

```csharp
public Task<int> CountAsync(string path) => Task.Run(() => Count(path));
```

`Task.Run` moves the call to a pool thread, which only helps when the call blocks. Wrapping a quick in-memory
call spends a thread to gain nothing, and wrapping a blocking call inside a web request spends a thread to
avoid spending a thread. Where a long blocking API has no async form, `Task.Run` is a reasonable last resort
with a comment explaining why.

## Matching the tool to the work

| Work                                               | Tool                                    |
| -------------------------------------------------- | --------------------------------------- |
| A network, disk or database call with an async API | `await`                                 |
| CPU bound and short                                | run it synchronously                    |
| CPU bound and long, one core                       | a better algorithm, then measure        |
| CPU bound across cores                             | `Parallel.ForEach`, or a worker process |
| A blocking API with no async form                  | `Task.Run`, with a comment              |

## Parallelism without tasks

```csharp
var results = new ConcurrentBag<int>();

Parallel.ForEach(files, file => results.Add(CountLines(file)));
```

`Parallel.ForEach` spreads CPU work across cores and is the right tool when nothing waits. Putting `await`
inside a `Parallel` body is the mistake to avoid: the body already owns a pool thread, and the await fights the
scheduler for another one.

## Parallelism has a price

Reading a small file takes about the same on one core as on eight, and the splitting adds overhead. Measure
before adding it, and expect a real win only when the work runs for seconds rather than milliseconds, or when
it waits.

## Check yourself

Take an async method that never waits and make it synchronous. Time both over a large loop and explain how much
of the difference the state machine accounts for.
