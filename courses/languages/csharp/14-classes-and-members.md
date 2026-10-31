---
title: Classes and members
summary: Fields, methods, access modifiers, and the members the compiler writes for you.
chapter: Classes and objects
minutes: 12
status: draft
---

## A class is state plus the behaviour that owns it

```csharp
public sealed class Basket
{
    private readonly List<Line> _lines = [];

    public void Add(Line line) => _lines.Add(line);

    public int Count => _lines.Count;

    public decimal Total => _lines.Sum(line => line.Subtotal);
}
```

`private` is the default for a member, so writing it on the field is optional. The leading underscore is a
convention rather than a rule, and worth following: it tells a reader at a glance that a name is a field
rather than a parameter.

## Access modifiers

| Modifier             | Visible to                             |
| -------------------- | -------------------------------------- |
| `private`            | the type itself                        |
| `internal`           | the assembly                           |
| `protected`          | the type and its subclasses            |
| `public`             | everyone                               |
| `private protected`  | subclasses in the same assembly        |
| `protected internal` | the assembly, plus subclasses anywhere |

Start at `private` and widen only when a caller needs it. Every public member is a promise, and the compiler
will not help you break it later.

## sealed, partial and static

```csharp
public sealed class Config { }
public partial class Generated { }
public static class Maths { }
```

`sealed` lets the runtime devirtualise calls and tells a reader that no subclass is coming. `partial` is how
a source generator adds to your type without editing your file. `static` is a set of related functions, which
in modern C# often reads better as an extension method.

## Two names, one object

```csharp
var first = new Basket();
var second = first;
second.Add(line);

Console.WriteLine(first.Count);   // 1
```

A class is shared by default, so passing one into a method hands over the ability to change it. A `struct`
behaves the other way, and that difference decides which of the two a type should be.

## Object initialisers

```csharp
var player = new Player { Name = "ada", Score = 0 };
Player other = new("grace");
```

An initialiser runs the constructor first and then sets the named members, which is why an `init`-only
property can be set there and nowhere else. The second line is a target-typed `new`: the type comes from the
left side, so a long type name is written once.

## Check yourself

Write a class with a private field, a property that reads it, and a method that changes it. Then make the
field public and write down what a caller can now do that you did not intend.
