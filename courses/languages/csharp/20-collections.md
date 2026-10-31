---
title: Collections
summary: List, Dictionary, HashSet and Queue, plus the interface to put in a signature.
chapter: The standard library
minutes: 13
status: draft
---

## The four you will use

```csharp
var lines = new List<Line>();
lines.Add(line);
lines.RemoveAll(l => l.Total == 0);

var prices = new Dictionary<string, decimal> { ["widget"] = 9.99m };
var seen = new HashSet<string>();
var queue = new Queue<Job>();
```

`List<T>` is the ordered sequence and the default choice. `Dictionary<TKey, TValue>` is the lookup. `HashSet<T>`
is membership and deduplication. `Queue<T>` and `Stack<T>` handle the two ends. Each also has a `Sorted`
variant when order by key matters, and an `Immutable` or `Concurrent` variant for the cases they serve.

## Looking up without an exception

```csharp
if (prices.TryGetValue("widget", out var price))
{
    Console.WriteLine(price);
}

var fallback = prices.GetValueOrDefault("missing", 0m);
prices["widget"] = 10m;
```

Indexing with `[]` throws when the key is absent, so `TryGetValue` and `GetValueOrDefault` are the two calls
to reach for on data you did not create. The indexer setter adds or replaces, which is usually what a caller
wants and worth knowing before it silently overwrites a value.

## Put the narrowest interface in the signature

```csharp
public decimal Total(IReadOnlyList<Line> lines)  // indexed, and the caller cannot change it
public void Log(IEnumerable<string> messages)     // only walked
public IList<Line> Open()                         // the caller may add to it
```

Declaring the smallest interface the method needs is the cheapest documentation in the language. One caveat:
`IEnumerable<T>` does not promise the sequence survives two enumerations, so when a method walks it twice,
`IReadOnlyList<T>` says so honestly.

## Capacity, the one micro-optimisation worth knowing

```csharp
var results = new List<Line>(capacity: rows.Count);
```

A list grows by doubling and copies its contents on each growth. When the count is known, passing the capacity
removes those copies. It matters in a loop that runs a million times, and it is harmless everywhere else.

## Equality decides the answers

```csharp
var set = new HashSet<Player>();
set.Add(new Player("ada"));
Console.WriteLine(set.Contains(new Player("ada")));
```

Without value equality that prints `False`, because the two objects are different references. `HashSet<T>` and
`Dictionary<TKey, TValue>` depend on `Equals` and `GetHashCode`, so a class that needs to work in either one
must override both, and a record does it for you.

## Check yourself

Count word frequencies with a `Dictionary<string, int>`, then with a `HashSet<string>`. Explain which question
each one answers, and what the other cannot tell you.
