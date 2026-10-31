---
title: Conditionals and switch expressions
summary: if, else, the switch statement, and the switch expression that returns a value.
chapter: Expressions and control flow
minutes: 12
status: draft
---

## Guards first, then the work

```csharp
public decimal Discount(Customer customer, decimal total)
{
    if (total <= 0)
    {
        return 0m;
    }

    return customer.Tier switch
    {
        >= 3 => total * 0.10m,
        >= 1 => total * 0.05m,
        _ => 0m,
    };
}
```

Two habits are worth copying from that method. Every guard that fails returns early, so the rest of the
body sits at one indentation level. And the branch that produces a value is a switch expression, which
reads as a table rather than as a tree.

## The switch expression returns a value

```csharp
public static string Describe(int status) => status switch
{
    200 => "ok",
    404 => "not found",
    >= 500 => "server error",
    _ => "unknown",
};
```

The arms are tried in order, so specific cases go above general ones: putting `>= 500` first would not
break this example, but putting `_ => "unknown"` first would swallow every other arm. `_` is the discard
and it has to be last. The compiler reports an error if a possible value has no arm, which is a real
advantage over an if chain.

## The switch statement is for actions

```csharp
switch (command)
{
    case "add":
        Add(args);
        break;
    case "remove":
        Remove(args);
        break;
    default:
        throw new ArgumentOutOfRangeException(nameof(command), command);
}
```

C# does not let one case fall into the next, so every section ends in `break`, `return` or `throw`. The
exception is an empty case, which is how two values share one body:

```csharp
switch (extension.ToLowerInvariant())
{
    case ".jpg":
    case ".jpeg":
        return "image/jpeg";
    default:
        return "application/octet-stream";
}
```

## Which one to reach for

A switch expression when the branches compute a value, a switch statement when they do something, and an
`if` when there are two or three conditions of different shapes. A switch that inspects a type is often a
sign that the behaviour belongs on the type itself.

## Check yourself

Write a function that maps an HTTP status code to a short description with a switch expression. Then add a
code that nothing matches, compile, and read the error the compiler gives you.
