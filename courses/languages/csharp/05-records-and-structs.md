---
title: Records and structs
summary: The two types that make data cheap to write, and when each one is the right choice.
chapter: Types and values
minutes: 13
status: draft
---

## A record is data with equality built in

```csharp
public sealed record Money(decimal Amount, string Currency);

var price = new Money(12.50m, "USD");
var same = new Money(12.50m, "USD");

Console.WriteLine(price == same);              // True, by value
Console.WriteLine(price with { Amount = 13m }); // Money { Amount = 13, Currency = USD }
```

A positional record gives you a constructor, properties, `Equals`, `GetHashCode`, `ToString` and a `with`
expression that copies and changes. Equality compares the values, which is what you want for a value
object and what you get from `class` only if you write it yourself.

## Records are reference types by default

```csharp
public readonly record struct Coord(double Latitude, double Longitude);
```

Adding `struct` gives a value type with the same conveniences: no allocation, copied on assignment,
and usable as a dictionary key. Use it for something small and short-lived, since a large struct is
copied every time it is passed.

## When a plain struct is right

```csharp
public readonly struct Temperature
{
    public double Celsius { get; }

    public Temperature(double celsius) => Celsius = celsius;

    public double Fahrenheit => Celsius * 9 / 5 + 32;
}
```

A `readonly struct` says the value cannot change after construction, so the compiler can pass it by
reference internally without letting a caller change it. The guidance is short and worth remembering:
under about 16 bytes, a struct is usually a win; much larger, and you are copying where you meant to
point.

## Reaching a struct through a property loses the change

```csharp
public struct Counter
{
    public int Value;
}

public sealed class Holder
{
    public Counter Counter { get; set; }
}

var holder = new Holder();
holder.Counter.Value = 1;
```

That last line does not compile: the property getter handed back a copy, so there is nothing to assign
to, and the compiler refuses rather than letting the write vanish. The fix builds a new value and assigns
it whole:

```csharp
var counter = holder.Counter;
counter.Value = 1;
holder.Counter = counter;
```

That verbosity is the signal. Prefer an immutable struct whose methods return a new value, or make it a
class when it has to change in place.

## Check yourself

Model an order line as a positional record and as a `class`. Compare the two by value and print both.
Then decide which one you would put in a `HashSet`, and why the other one needs more work to qualify.
