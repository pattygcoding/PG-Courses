---
title: Tasks and async-await
summary: What a Task is, what the compiler generates, and why async spreads up the call chain.
chapter: Async
minutes: 14
status: draft
---

## A Task is a promise of a result later

```csharp
Task<int> pending = ReadCountAsync(path);
int count = await pending;
```

`await` suspends the method until that promise resolves. The thread is not blocked: it is handed back to the
runtime to do other work, and the method resumes when the result arrives. That is the entire benefit, and it is
why async helps when the work is waiting rather than computing.

## async is a compiler transformation

```csharp
public async Task<int> ReadCountAsync(string path)
{
    var text = await File.ReadAllTextAsync(path);
    return text.Split('\n').Length;
}
```

The keyword lets the method use `await` and tells the compiler to build a state machine that can be paused. The
method returns at the first await that has not finished, and the rest runs later. A method can also return
`Task<T>` without `async`, which is what a thin wrapper around another task looks like.

## async spreads upward

```csharp
public async Task<Report> BuildAsync(string path)
{
    var count = await ReadCountAsync(path);
    return new Report(count);
}
```

You cannot await inside a method that is not async, so one async call usually makes its callers async and
`async` appears in signatures all the way up. The alternative people reach for is blocking on the task:

```csharp
var count = ReadCountAsync(path).Result;
```

That occupies a thread while the operation is in flight, and in a UI or a request handler it can deadlock,
because the continuation needs the very thread that is waiting. Async all the way up is the rule that avoids
both problems.

## Task, Task<T> and ValueTask

```csharp
Task SaveAsync();
Task<int> CountAsync();
ValueTask<int> TryCountAsync();
```

`Task` completes and produces nothing, `Task<T>` produces a value. `ValueTask<T>` avoids an allocation when a
method usually finishes without waiting, at the price of a strict rule: await it once and do not store it. Use
it in a hot library path, and `Task<T>` everywhere else.

## Keep the waiting apart from the work

```csharp
var text = await File.ReadAllTextAsync(path);   // waits
var words = text.Split(' ');                    // computes
```

Reading is waiting and splitting is computing. Mixing long stretches of each inside one method hides which
part occupies a thread, and it is the usual reason a method that looks async still holds one.

## Check yourself

Write an async method that reads a file and counts its lines, call it from a console entry point, and print the
thread id before and after the await. Explain which part of the run changed thread and which part could not.
