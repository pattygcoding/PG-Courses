---
title: Pattern matching
summary: Type, property, positional and list patterns, and the ones that beat a chain of checks.
chapter: Expressions and control flow
minutes: 14
status: draft
---

## Four patterns you will use most days

```csharp
object value = "hello";

if (value is string text)            { }   // type pattern, with a binding
if (value is not null)               { }   // not null
if (value is int n and > 0 and < 100) { }  // logical and relational
if (value is string { Length: > 3 } longer) { }   // property pattern
```

Each one tests and binds in a single expression, so the compiler knows the type and the non-nullness of
what it bound. That is the difference from casting: `value as string` gives you a nullable reference and
no proof that the cast succeeded.

## Property patterns unpack an object

```csharp
public static decimal Shipping(Order order) => order switch
{
    { Country: "US", Total: >= 50m } => 0m,
    { Country: "US" } => 5m,
    { Express: true } => 25m,
    _ => 15m,
};
```

The pattern names the properties it cares about and ignores the rest, so adding a field to `Order` does
not touch this method. Nested properties work too, as `{ Address.City: "Berlin" }`, which is safe when a
middle step is null.

## Positional patterns use the deconstructor

```csharp
public readonly record struct Point(int X, int Y);

var where = new Point(0, 3) switch
{
    (0, 0) => "origin",
    (0, _) => "on the y axis",
    (_, 0) => "on the x axis",
    var (x, y) when x == y => "diagonal",
    _ => "somewhere else",
};
```

A record generates the `Deconstruct` method these patterns call. Order decides the answer: `(0, 0)` has to
come before `(0, _)` or the origin would report as the y axis.

## List patterns

```csharp
int[] values = [1, 2, 3];

var shape = values switch
{
    [] => "empty",
    [var only] => $"one value: {only}",
    [var first, .., var last] => $"from {first} to {last}",
};
```

The slice pattern `..` matches zero or more elements, so the last arm accepts two or more. Parsing a fixed
header, such as the first two fields of a protocol message, is where this earns its place.

## Guards narrow a matched arm

```csharp
switch (value)
{
    case int n when n > 0:
        Console.WriteLine($"positive {n}");
        break;
    case int n:
        Console.WriteLine($"zero or negative {n}");
        break;
}
```

The `when` clause runs after the pattern matched, so the bound name is available. Keep the guard to one
condition; a guard with `&&` chains is easier to read as an ordinary `if` inside the arm.

## Check yourself

Write a function that classifies a list of integers by length and contents using list patterns. Then
reorder two arms so the answer changes, and explain which ordering rule you broke.
