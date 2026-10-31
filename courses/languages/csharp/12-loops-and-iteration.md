---
title: Loops and iteration
summary: foreach, for, while and yield, and the collection rules that make each one the right choice.
chapter: Expressions and control flow
minutes: 12
status: draft
---

## foreach is the default

```csharp
foreach (var row in rows)
{
    Console.WriteLine(row.Name);
}

foreach (var (key, value) in lookup)
{
    Console.WriteLine($"{key} = {value}");
}
```

`foreach` asks the collection for an enumerator and disposes it at the end, which is why it works on
anything implementing `IEnumerable<T>` and why it cleans up a file reader for you. It is the loop to reach
for unless you need the index.

## Modifying a collection while looping over it

```csharp
foreach (var row in rows.ToList())
{
    if (row.Total == 0)
    {
        rows.Remove(row);
    }
}
```

Changing a `List<T>` while enumerating throws `InvalidOperationException`, because the enumerator notices
the version changed. Iterating a copy is the direct fix. Removing by predicate is better when that is the
whole job:

```csharp
rows.RemoveAll(row => row.Total == 0);
```

## for when the index is part of the problem

```csharp
for (var index = rows.Count - 1; index >= 0; index--)
{
    if (rows[index].Total == 0)
    {
        rows.RemoveAt(index);
    }
}
```

Walking backwards makes removal safe without a copy. Keep the loop body short when using `for`, because
the index arithmetic is where off-by-one errors live and a reader has to check it.

## while and do

```csharp
using var reader = new StreamReader(path);

while (reader.ReadLine() is { } line)
{
    Console.WriteLine(line);
}

var attempts = 0;
do
{
    attempts++;
} while (!TryConnect() && attempts < 3);
```

`while` tests before the body and `do` after it. The pattern `is { } line` both tests for null and binds
the value, which is the shortest way to write a read-until-empty loop.

## yield turns a method into an iterator

```csharp
public static IEnumerable<string> ReadLines(string path)
{
    using var reader = new StreamReader(path);

    while (reader.ReadLine() is { } line)
    {
        if (line.Trim().Length > 0)
        {
            yield return line;
        }
    }
}
```

Nothing runs until something enumerates the result, and only one line is in memory at a time. The `using`
block stays alive across the whole iteration, so building a pipeline this way is how a large file gets
processed without loading it.

## Check yourself

Write an iterator that yields the prime numbers below a limit, take the first five with `Take`, and confirm
with a print that the iterator stopped early rather than computing all of them.
