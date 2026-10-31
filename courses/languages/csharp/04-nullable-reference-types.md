---
title: Nullable reference types
summary: The compiler setting that turns a class of null bugs into build errors, and how to write code that satisfies it.
chapter: Types and values
minutes: 14
status: draft
---

## The warning you are paying for

```csharp
string name = null;              // CS8600: converting null literal to non-nullable
Console.WriteLine(name.Length);
```

With `<Nullable>enable</Nullable>` the compiler tracks whether a reference could be null at every point.
It reports a warning where the value might be null and you use it, and where you assign a possible null
to something declared non-nullable. The code above has two problems and no test would catch them
before the crash.

## Declaring intent with ?

```csharp
public string? Find(string key)
{
    return _rows.TryGetValue(key, out var value) ? value : null;
}

public string FindOrDefault(string key)
{
    return _rows.TryGetValue(key, out var value) ? value : "";
}
```

The first signature says null is a normal answer and the caller must handle it. The second says it is
not, and the compiler holds the method to that. Two names, two contracts, and neither needs a comment.

## Making the compiler follow your logic

```csharp
public void Greet(string? name)
{
    if (name is null)
    {
        Console.WriteLine("hello, stranger");
        return;
    }

    Console.WriteLine($"hello, {name.Trim()}");
}
```

After the guard returns, the compiler knows `name` is not null in the rest of the method, so the second
call needs no `!`. Flow analysis is what makes nullable usable: you write an ordinary early return and
the warnings disappear because the reasoning is visible.

Helpers the compiler understands:

```csharp
if (string.IsNullOrWhiteSpace(name)) { return; }
if (name is { Length: > 0 } text) { Console.WriteLine(text); }
_ = name ?? throw new ArgumentNullException(nameof(name));
```

## When the compiler cannot know

```csharp
public override bool Equals(object? obj)
{
    return obj is Player other && other.Name == Name;
}
```

The `!` operator tells the compiler to stop worrying, and it is a claim you are making about run time.
Every use is a hole in the checking, so keep them where the evidence is real: a framework guarantee, a
tested invariant, or a check the compiler cannot see through.

## Check yourself

Turn nullable on in a project that was written without it and read every warning before fixing anything.
Fix them by changing the code rather than by adding `!`, and count how many were real bugs.
