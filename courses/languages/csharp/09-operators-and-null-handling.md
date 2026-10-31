---
title: Operators and null handling
summary: The null-conditional and null-coalescing operators, and the small set of rules that keep them readable.
chapter: Expressions and control flow
minutes: 12
status: draft
---

## The three null operators

```csharp
string? maybe = Find("ada");

var length = maybe?.Length;              // int?  null when maybe is null
var text = maybe ?? "unknown";           // string, never null
maybe ??= "assigned if null";            // assigns only when the left side is null
var safe = maybe?.Trim().ToUpperInvariant();
```

`?.` short-circuits the rest of the chain, so `maybe?.Trim().ToUpperInvariant()` never calls `Trim` on
null and the whole expression evaluates to null. `??` gives a fallback, and `??=`, added in C# 8, replaces
the `if (x is null) x = ...` line that used to appear everywhere.

Chains are worth keeping short. Two `?.` in a row hide a method that should have returned something
non-null, and a chain of four is a sign that a type is doing too little work.

## Null-forgiving versus null-checking

```csharp
Console.WriteLine(name!.Length);                        // you claim it is not null
Console.WriteLine(name?.Length ?? 0);                   // the code decides what to do
ArgumentNullException.ThrowIfNull(name);                // throws, and the compiler knows it
```

`!` silences the compiler and changes nothing at run time. `ThrowIfNull` is the modern guard: one line,
the right exception type, the parameter name filled in automatically, and after it the compiler treats the
value as non-null.

## Pattern matching reads better than a chain of checks

```csharp
if (customer is { Address.City: "Berlin", LoyaltyTier: >= 2 })
{
    ApplyFreeShipping();
}
```

The same test with `&&` is longer, and it is easy to write one that throws when a middle step is null.
Property patterns check the whole path safely.

## Boolean operators on values

```csharp
var ready = isLoaded && count > 0;
var fallback = firstChoice || secondChoice;
var either = a | b;      // evaluates both, no short circuit
var bothTrue = a & b;
```

`&&` and `||` short-circuit. `&` and `|` evaluate both sides, so on `bool` they are a deliberate way to say
that the right-hand side matters or costs something, and on integers they are bitwise operations.

## Check yourself

Rewrite a chain of nested null checks as one expression with `?.` and `??`. Then find a place in your code
where a `!` could be replaced by `ThrowIfNull` and make the change.
