---
title: Delegates, lambdas and local functions
summary: Three ways to pass behaviour around, and the closure behaviour that surprises people once.
chapter: Expressions and control flow
minutes: 13
status: draft
---

## The two delegate types behind almost everything

```csharp
Func<int, int> square = x => x * x;
Action<string> log = message => Console.WriteLine(message);
Predicate<int> isEven = x => x % 2 == 0;

Console.WriteLine(square(4));
log("started");
Console.WriteLine(isEven(7));
```

`Func<...>` returns a value, `Action<...>` returns nothing, and both take up to sixteen parameters. A
custom `delegate` type is worth declaring when the signature has a name that means something, such as
`public delegate decimal PricingRule(Order order)`, because the name appears in every error and every
editor tooltip.

## Method groups save a lambda

```csharp
var names = new[] { "ada", "grace" };
var upper = names.Select(ToUpper).ToList();

static string ToUpper(string value) => value.ToUpperInvariant();
```

Where the lambda would do nothing but forward its arguments, the method name alone works and reads better.

## A local function is a method inside a method

```csharp
public decimal Total(IEnumerable<Line> lines)
{
    decimal sum = 0;

    foreach (var line in lines)
    {
        sum += LineTotal(line);
    }

    return sum;

    decimal LineTotal(Line line) => line.Quantity * line.UnitPrice;
}
```

A local function can be declared after the code that calls it, can capture the enclosing variables, and
does not allocate a delegate unless it is converted to one. A lambda assigned to a variable allocates at
the point of assignment.

## Closures capture the variable, not the value

```csharp
var actions = new List<Func<int>>();

for (var index = 0; index < 3; index++)
{
    actions.Add(() => index);
}

foreach (var action in actions)
{
    Console.WriteLine(action());   // 3, 3, 3
}
```

Every closure captured the same `index`, and by the time they run it holds 3. Copy it inside the loop, or
use `foreach`, which creates a fresh variable per iteration:

```csharp
foreach (var index in Enumerable.Range(0, 3))
{
    actions.Add(() => index);   // 0, 1, 2
}
```

## static lambdas stop accidental captures

```csharp
var upper = names.Select(static name => name.ToUpperInvariant());
```

The `static` modifier says the lambda captures nothing, so the compiler reports an error if it tries. On a
hot path that matters, because a capturing lambda allocates a closure object every time it is created.

## Check yourself

Build a list of lambdas inside a loop, call them, and explain the output. Then fix it two ways, with a
copy inside the loop and with `foreach`, and note which one you would rather read.
