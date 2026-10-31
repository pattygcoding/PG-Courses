---
title: Exceptions
summary: try, catch and finally, the catches that hide bugs, and how to read a stack trace.
chapter: Errors and resources
minutes: 12
status: draft
---

## Two clauses and one guarantee

```csharp
public static int ParsePort(string raw)
{
    try
    {
        return int.Parse(raw, CultureInfo.InvariantCulture);
    }
    catch (FormatException error)
    {
        throw new ArgumentException($"not a number: {raw}", nameof(raw), error);
    }
    finally
    {
        Console.WriteLine("parse attempted");
    }
}
```

`catch` runs on a matching exception and `finally` runs whether or not one was thrown, including when the
method returns from inside the `try`. C# has no `else` clause, so code that should only run on success goes
after the `try` block, and the `try` stays as short as the single call being guarded.

## Catch the narrowest type, and filter it

```csharp
try
{
    Save(record);
}
catch (IOException error) when (error.HResult != 32)
{
    Log.Warning(error, "save failed for {Id}", record.Id);
}
```

An exception filter with `when` runs before the stack unwinds, so it can inspect the exception and decide
without catching and rethrowing. `catch (Exception)` also catches the bugs you have not found yet, and it
discards the trace that would have found them.

## An empty catch is a bug

```csharp
try
{
    Save(record);
}
catch (Exception)
{
}
```

Nothing was logged, the caller was told nothing, and the record is gone. Even one line that logs the record
identifier leaves a trail, and letting the exception travel to a handler that can decide is usually better
than swallowing it here.

## Which to throw

| Situation                          | Exception                     |
| ---------------------------------- | ----------------------------- |
| Wrong type passed                  | `ArgumentException`           |
| Right type, impossible value       | `ArgumentOutOfRangeException` |
| Null where a value is required     | `ArgumentNullException`       |
| Operation invalid in this state    | `InvalidOperationException`   |
| Not supported at all               | `NotSupportedException`       |
| A method a subclass must implement | `NotImplementedException`     |

`ArgumentNullException.ThrowIfNull(value)` and its siblings are the shortest correct guard, and they fill in
the parameter name for you.

## Reading a stack trace

```text
System.InvalidOperationException: Sequence contains no elements
   at System.Linq.ThrowHelper.ThrowNoElementsException()
   at System.Linq.Enumerable.Max[TSource](IEnumerable`1 source)
   at Shop.Pricing.Total(IEnumerable`1 lines) in /src/Shop/Pricing.cs:line 42
   at Shop.Program.Main(String[] args) in /src/Shop/Program.cs:line 12
```

Read the first line for what happened and the first frame naming your own code for where to start. Frames
without file names mean the build shipped without its symbols, which makes every future report harder, so keep
the PDB alongside the deployment.

## Check yourself

Catch an exception, rethrow it with more context, and read the resulting trace. Then replace a bare
`catch (Exception)` in your code with a filter that names the case you actually meant to handle.
