---
title: Equality and hashing
summary: Why two equal objects must hash the same, and how records, strings and structs already get this right.
chapter: Types and values
minutes: 12
status: draft
---

## Reference equality is the default

```csharp
var a = new Player { Name = "ada" };
var b = new Player { Name = "ada" };

Console.WriteLine(a == b);                  // False
Console.WriteLine(a.Equals(b));             // False
Console.WriteLine(ReferenceEquals(a, b));   // False
```

A class without an `Equals` override compares references, so two objects with the same data are different.
The same `new Player { Name = "ada" }` written twice gives one `HashSet` two entries.

## A record gives you value equality

```csharp
public sealed record Player(string Name);

var a = new Player("ada");
var b = new Player("ada");

Console.WriteLine(a == b);          // True
Console.WriteLine(a.GetHashCode() == b.GetHashCode());   // True
```

Records generate `Equals`, `GetHashCode`, `==` and `!=` from the fields, so equality and hashing agree by
construction. That is the main reason to reach for a record when the type is a value with a name.

## Writing both yourself, when you have to

```csharp
public sealed class Player(string name) : IEquatable<Player>
{
    public string Name { get; } = name;

    public bool Equals(Player? other) =>
        other is not null && string.Equals(Name, other.Name, StringComparison.Ordinal);

    public override bool Equals(object? obj) => Equals(obj as Player);

    public override int GetHashCode() => Name.GetHashCode(StringComparison.Ordinal);
}
```

The two rules are that `Equals` must agree with `GetHashCode`, and that a type you use as a dictionary key
must not change after it is added. `IEquatable<T>` avoids boxing on the generic collections, which is the
difference between a fast lookup and an allocation per comparison.

## Strings, and the comparison you keep forgetting

```csharp
var a = "straße";
var b = "STRASSE";

Console.WriteLine(a.Equals(b, StringComparison.OrdinalIgnoreCase));          // False
Console.WriteLine(a.Equals(b, StringComparison.CurrentCultureIgnoreCase));   // True on a German machine
```

`==` on strings is ordinal, which is right for identifiers, keys and protocols. Anything a person typed
and you are matching for display should say which comparison it wants, because the default answer changes
with the machine's culture and that is a bug report you cannot reproduce.

## Check yourself

Put two records with the same values in a `HashSet` and count the entries. Then do the same with a class
that overrides `Equals` but not `GetHashCode`, and explain the result.
