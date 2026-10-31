---
title: Inheritance and polymorphism
summary: Overriding, virtual dispatch, and the composition that often beats both.
chapter: Classes and objects
minutes: 14
status: draft
---

## abstract, virtual and override

```csharp
public abstract class Shape
{
    public abstract double Area { get; }

    public virtual string Describe() => $"a shape of area {Area:F2}";
}

public sealed class Circle(double radius) : Shape
{
    public override double Area => Math.PI * radius * radius;

    public override string Describe() => $"a circle of radius {radius}";
}
```

`abstract` means a subclass must supply the member. `virtual` means a default exists that a subclass may
replace. `override` is required to replace either, so a reader can see which members are polymorphic by
reading the base type.

## Dispatch follows the object, not the variable

```csharp
Shape[] shapes = [new Circle(1), new Square(2)];

foreach (var shape in shapes)
{
    Console.WriteLine(shape.Describe());
}
```

The loop knows only `Shape`, and each object answers for itself. That is the property worth paying for:
adding a new shape changes no caller, which is what removes the switch on type that would otherwise appear
in every place that handles shapes.

## Calling the base version

```csharp
public sealed class LoggingShape(Shape inner) : Shape
{
    public override double Area => inner.Area;

    public override string Describe() => $"logged: {inner.Describe()}";
}
```

`base.Describe()` calls the inherited implementation, which a subclass needs when it extends rather than
replaces. That object above composes instead of inheriting, and it works with any shape because it holds the
base type.

## Seal what you did not design for inheritance

```csharp
public sealed class Circle(double radius) : Shape { }
```

Sealing lets the runtime turn a virtual call into a direct one, and it tells a reader no further behaviour is
coming. A virtual member added to a class that strangers subclass becomes a contract you cannot withdraw,
which is why the safe default is `sealed` until you have a reason.

## Composition over inheritance, concretely

```csharp
public sealed class CachedReader
{
    private readonly IFileReader _inner;
    private readonly Dictionary<string, string> _cache = [];

    public CachedReader(IFileReader inner) => _inner = inner;

    public string Read(string path)
    {
        if (!_cache.TryGetValue(path, out var text))
        {
            text = _inner.Read(path);
            _cache[path] = text;
        }

        return text;
    }
}
```

Inheriting binds you to every implementation detail of the base, including ones added later by somebody who
has never seen your class. Holding the object and forwarding the calls keeps that coupling visible and works
with every implementation of the interface.

## Check yourself

Write a base class with one abstract member and one virtual member, two subclasses, and a loop that calls both
through the base type. Then rewrite one subclass as composition and say which version reads better.
