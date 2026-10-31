---
title: Properties and fields
summary: Auto-properties, init-only setters, computed properties and why a public field is a trap.
chapter: Classes and objects
minutes: 11
status: draft
---

## Four property shapes

```csharp
public sealed class Player
{
    public string Name { get; set; } = "";
    public int Score { get; private set; }
    public string Id { get; init; } = "";
    public bool IsWinner => Score >= 100;
}
```

An auto-property with `set` is open to anyone. `private set` lets only the type change it. `init` allows a
write during construction and nowhere else. The expression-bodied property has no setter at all, so it
cannot fall out of step with the fields it reads.

Prefer a property to a public field for one concrete reason: a property can later gain validation or become
computed without changing how every caller uses it, and a public field cannot.

## init and with

```csharp
var first = new Player { Name = "ada", Id = "p1" };
var second = first with { Name = "grace" };
```

`init` can be set in an object initialiser or a `with` expression. On a record, `with` copies the object and
applies the changes, which is how a value object is updated without a setter existing anywhere.

## A backing field when there is a rule

```csharp
public sealed class Order
{
    private decimal _total;

    public required decimal Total
    {
        get => _total;
        set
        {
            ArgumentOutOfRangeException.ThrowIfNegative(value);
            _total = value;
        }
    }
}
```

The property is the only way in, so the rule cannot be bypassed by a caller and does not need repeating in
every method. A backing field on a property with no rule costs lines and buys nothing.

## Computed rather than stored

```csharp
public decimal Subtotal => Quantity * UnitPrice;
public decimal Vat => Math.Round(Subtotal * 0.2m, 2, MidpointRounding.AwayFromZero);
```

A computed property is always current, which removes a whole class of bug where a cached field drifts from
the values it was derived from. When the computation is genuinely expensive, cache it in the setter that
invalidates it, and say why in a comment.

## Check yourself

Add a validating property, a computed property and an `init`-only property to one class. Construct two
instances, change one with `with`, and confirm the other is untouched.
