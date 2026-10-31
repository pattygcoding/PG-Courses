---
title: Strings and text handling
summary: Immutability, StringBuilder, splitting, and the comparison that has to name its culture.
chapter: The standard library
minutes: 13
status: draft
---

## Strings are immutable

```csharp
var greeting = "hello";
var louder = greeting.ToUpperInvariant();

Console.WriteLine(greeting);   // hello
Console.WriteLine(louder);     // HELLO
```

Every method returns a new string. That is why `+=` inside a loop allocates a fresh string and copies the old
one on each pass, and it is the single performance rule about strings worth memorising.

## Building text in a loop

```csharp
var builder = new StringBuilder();

foreach (var row in rows)
{
    builder.Append(row.Name).Append(',').Append(row.Total).AppendLine();
}

var csv = builder.ToString();
```

`StringBuilder` appends into a buffer that grows geometrically, so a thousand rows cost a handful of
allocations. For a fixed set of values, interpolation and `string.Join` are simpler and just as fast:

```csharp
var line = $"{row.Name},{row.Total}";
var joined = string.Join(", ", names);
```

## Splitting and trimming

```csharp
var parts = line.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
```

The two options matter: `TrimEntries` trims each result and `RemoveEmptyEntries` drops the empty strings a
trailing separator leaves behind. Splitting on a comma suits machine-generated data, and a CSV reader exists
for everything else.

## Comparison has to name its culture

```csharp
name.Equals("ada", StringComparison.Ordinal)                   // exact
name.Equals("ada", StringComparison.OrdinalIgnoreCase)         // exact, ignoring case
name.Equals("ada", StringComparison.CurrentCultureIgnoreCase)  // what a person expects
```

Ordinal is right for identifiers, keys, file paths and protocol values. Culture-aware comparison is right for
text a person typed that you are matching for display. Leaving the choice out lets the machine's locale decide,
which is how a test passes on a laptop and fails on a build agent.

## Slicing without allocating

```csharp
ReadOnlySpan<char> span = line.AsSpan();
var head = span[..span.IndexOf(',')];
```

A slice of a `string` allocates; a slice of a `ReadOnlySpan<char>` does not, because the span points into the
existing text. A parser over input that arrives in bulk is where that matters, and everywhere else the
readable version wins.

## Check yourself

Build the same thousand-line string with `+=` and with `StringBuilder` and time both. Then compare an
identifier with ordinal and culture-aware comparison and find an input where the two disagree.
