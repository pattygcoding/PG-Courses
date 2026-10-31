---
title: IDisposable and using
summary: Deterministic cleanup, the pattern a real handle needs, and the async version.
chapter: Errors and resources
minutes: 12
status: draft
---

## using releases at the end of the scope

```csharp
using var reader = new StreamReader(path);

while (reader.ReadLine() is { } line)
{
    Console.WriteLine(line);
}
```

`Dispose` runs when the scope ends, whether it ended normally, returned, or threw. That is the whole
difference from waiting for the garbage collector, which runs when it decides to and may not run at all before
the process exits. A file handle, a connection, a transaction and a lock all need this.

## Statement or declaration

```csharp
using (var connection = new SqlConnection(connectionString))
{
    connection.Open();
    // the connection is closed here, before the rest of the method
}

using var transaction = connection.BeginTransaction();   // closed at the end of the method
```

Both forms dispose. The statement makes the scope explicit, which matters when you want the release to happen
earlier than the end of the method.

## A using inside an iterator

```csharp
public static IEnumerable<string> ReadLines(string path)
{
    using var reader = new StreamReader(path);

    while (reader.ReadLine() is { } line)
    {
        yield return line;
    }
}
```

The compiler moves the `using` into the generated enumerator, so the reader is disposed when the caller stops
enumerating, including when it stops early through `break` or `Take`. That is why a large file can be streamed
as a sequence without leaking a handle.

## Writing the pattern yourself

```csharp
public sealed class TemporaryFolder : IDisposable
{
    private bool _disposed;

    public TemporaryFolder()
    {
        Path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path);
    }

    public string Path { get; }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        Directory.Delete(Path, recursive: true);
    }
}
```

A class holding only managed objects needs `Dispose` and a guard against a second call. The fuller pattern with
`Dispose(bool)` and `GC.SuppressFinalize` exists for owning an unmanaged handle, which is rare in application
code and worth copying from the documentation when it happens.

## The asynchronous version

```csharp
await using var stream = File.OpenRead(path);
```

`await using` and `IAsyncDisposable` exist for a resource whose cleanup has to wait, such as a connection pool
entry. Use them wherever the API offers them, because disposing an async handle synchronously blocks a thread.

## Check yourself

Write a class that holds a file handle, dispose it with `using`, and prove the handle is released by opening the
same file for exclusive write. Then convert the cleanup to `IAsyncDisposable` and use `await using`.
