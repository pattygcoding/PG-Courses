---
title: Enums, flags and constants
summary: Named values that the compiler checks, and the three ways to write them.
chapter: Types and values
minutes: 11
status: draft
---

## An enum is a named integer with a type

```csharp
public enum Status
{
    Pending,
    Paid,
    Shipped,
}

var status = Status.Paid;
Console.WriteLine((int)status);   // 1
Console.WriteLine(status);        // Paid
```

The compiler rejects `Status.Cancelled` if it is not declared, so a typo becomes a build error instead of
a runtime lookup failure. That is the whole argument for an enum over a string constant, and it is a good
one.

## Values are part of the contract

```csharp
public enum Status
{
    Pending = 0,
    Paid = 1,
    Shipped = 2,
}
```

Writing the numbers makes the wire format explicit. It matters when the value is stored in a database or
sent to another system, because inserting a member in the middle silently renumbers everything after it.
Adding new members at the end is safe; anything else is a migration.

## Flags for combinations

```csharp
[Flags]
public enum Permissions
{
    None = 0,
    Read = 1 << 0,
    Write = 1 << 1,
    Delete = 1 << 2,
    All = Read | Write | Delete,
}

var allowed = Permissions.Read | Permissions.Write;
Console.WriteLine(allowed.HasFlag(Permissions.Read));   // True
```

Each member is one bit, so combinations fit in a single value. Give an explicit `None = 0` and use powers
of two, never sequential numbers, or the combinations overlap and `HasFlag` answers nonsense.

## Constants and static readonly

```csharp
public const int MaxRetries = 3;
public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(30);
```

`const` is folded into the calling assembly at compile time, which means a library that changes a public
`const` needs every caller rebuilt to see the new value. `static readonly` is resolved when the type is
first used, so it is the right choice for anything shared across assemblies and the only choice for types
that cannot be constant, such as `TimeSpan` or an array.

## When a string is still the right answer

An enum cannot grow at run time, so a set of values that comes from configuration or from a plugin belongs
in a string or a lookup table. Use an enum when the set is fixed and known to the compiler, and a string
when the set is data.

## Check yourself

Add a `Cancelled` member to an enum that is stored in a file, write and read a record, and explain why
placing it in the middle rather than at the end is a breaking change.
