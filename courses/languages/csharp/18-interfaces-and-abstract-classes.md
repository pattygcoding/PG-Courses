---
title: Interfaces and abstract classes
summary: Contracts a type can implement many of, and the base class it can have only one of.
chapter: Classes and objects
minutes: 13
status: draft
---

## An interface says what a type can do

```csharp
public interface IPricingRule
{
    decimal Apply(Order order);
}

public sealed class MemberDiscount : IPricingRule
{
    public decimal Apply(Order order) => order.Total * 0.05m;
}
```

A class implements as many interfaces as it likes, so an interface gives you multiple contracts without
multiple inheritance of state. Keep each one to the members a caller actually needs, and name it for the
capability rather than the class that happens to implement it.

## The small interface that makes tests deterministic

```csharp
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
```

One member, one job. Any code that needs the current time takes an `IClock`, so a test can hand it a fixed
instant and the test stops depending on when it runs. This is the most useful three lines of indirection in
most codebases.

## Default interface members

```csharp
public interface ILogger
{
    void Log(string message);

    void LogError(string message) => Log($"ERROR {message}");
}
```

A member with a body is a default implementation, so an implementer writes only `Log`. It exists so a
published interface can gain a member without breaking every implementation, which is a library problem
rather than an everyday tool.

## An abstract class when state is shared

```csharp
public abstract class RepositoryBase
{
    protected RepositoryBase(string connectionString) => ConnectionString = connectionString;

    protected string ConnectionString { get; }

    public abstract string? Get(int id);
}
```

An abstract class can hold fields, a constructor and protected helpers, so it fits when the subclasses share
state or setup. It uses the single base class slot, so it has to earn that cost.

## Choosing between them

An interface when you are describing what a type does for a caller. An abstract class when you are sharing
implementation with the types that extend you. Most of the time the answer is the interface, with the shared
implementation in a separate class the callers never see.

## Check yourself

Extract an interface from a class you have written, inject it instead of the concrete type, and write one test
with a fake implementation. Then decide whether the interface earned its place.
