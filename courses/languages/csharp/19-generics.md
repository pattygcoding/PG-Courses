---
title: Generics
summary: Type parameters that constrain, generic methods, and what covariance actually means.
chapter: Classes and objects
minutes: 14
status: draft
---

## A generic type is written once and checked per use

```csharp
public sealed class Cache<TKey, TValue> where TKey : notnull
{
    private readonly Dictionary<TKey, TValue> _items = [];

    public void Set(TKey key, TValue value) => _items[key] = value;

    public TValue? Get(TKey key) => _items.TryGetValue(key, out var value) ? value : default;
}
```

`Cache<string, int>` and `Cache<int, Order>` are both checked at compile time and neither boxes its values.
The version before generics took `object` and cast at every call site, which moved the mistake from the
compiler to whatever test happened to exercise it.

## Constraints are what make a type parameter usable

```csharp
public static T Max<T>(T a, T b)
    where T : IComparable<T> =>
    a.CompareTo(b) >= 0 ? a : b;
```

The constraint is what allows `CompareTo` in the body, and it documents what `T` must support. The ones worth
knowing:

```csharp
where T : class          // a reference type
where T : struct         // a value type
where T : notnull        // usable as a dictionary key
where T : new()          // has a parameterless constructor
where T : IComparable<T> // supports what the body needs
```

## Generic methods infer from the arguments

```csharp
var bigger = Max(3, 5);
var longest = Max("ada", "grace");
```

The compiler works out `int` and `string` from the arguments, so explicit type arguments are rare. Needing
them is usually a sign that the parameters describe a type rather than a value.

## Covariance, and why List is not covariant

```csharp
IEnumerable<object> sequence = new List<string> { "a" };
List<object> list = new List<string> { "a" };
```

The first line compiles and the second does not. A sequence only reads, so a sequence of strings is a
sequence of objects. A list can be written to, so allowing the conversion would let an `int` into a
`List<string>`. A library declares which one it is:

```csharp
public interface IReader<out T> { T Read(); }
public interface IWriter<in T> { void Write(T value); }
```

`out` marks a type parameter used only in return positions and `in` marks one used only in parameters. The
compiler enforces the rule rather than trusting the author.

## Check yourself

Write a generic `TryGet<TKey, TValue>` with a `notnull` constraint on the key and a nullable return. Then
write the same method taking `object` and compare the two call sites, including what the compiler tells you at
each one.
