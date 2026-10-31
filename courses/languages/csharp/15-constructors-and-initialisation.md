---
title: Constructors and initialisation
summary: required members, init-only setters, and the field initialisation order the compiler follows.
chapter: Classes and objects
minutes: 13
status: draft
---

## Validation belongs in the constructor

```csharp
public sealed class Account
{
    public Account(string owner, decimal balance)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentOutOfRangeException.ThrowIfNegative(balance);

        Owner = owner;
        Balance = balance;
    }

    public string Owner { get; }
    public decimal Balance { get; }
}
```

Throwing from the constructor means an invalid object cannot exist, so no other method has to check those
fields again. The modern guard helpers name the parameter for you and keep the check to one line.

## required moves the check to compile time

```csharp
public sealed class Player
{
    public required string Name { get; init; }
    public int Score { get; init; }
}

var player = new Player { Name = "ada" };
```

`required` plus `init` gives an immutable object that the caller configures where it is created, and leaving
`Name` out is a build error rather than a null somewhere else. This replaces the constructor that took five
optional parameters, four of which were always the same.

## Primary constructors

```csharp
public sealed class Basket(string owner)
{
    public string Owner { get; } = owner;
    public List<Line> Lines { get; } = [];
}
```

A primary constructor declares the arguments every instance needs and the compiler stores them. Keep it to
required values; a primary constructor with six parameters is a constructor you cannot read at the call site.

## Field initialisation order

```csharp
public sealed class Order
{
    private readonly List<Line> _lines = [];
    private readonly int _capacity;

    public Order(int capacity) => _capacity = capacity;
}
```

Field initialisers run in declaration order before the constructor body, and the base constructor runs before
either. A field read before it is assigned holds its default value, which for a reference type is null. That
is the mechanism behind the warning you get when a constructor calls a virtual method.

## Chaining constructors

```csharp
public sealed class Config
{
    public Config()
        : this("appsettings.json") { }

    public Config(string path) => Path = path;

    public string Path { get; }
}
```

The `: this(...)` form runs the other constructor first, so validation and defaults live in one place.
`: base(...)` does the same for the base class and is required when the base has no parameterless
constructor.

## Check yourself

Write a class with a `required` property and an `init` property, construct it with an initialiser, and then
remove the required one and read the error. Add a guard to the constructor and confirm it throws on bad
input.
