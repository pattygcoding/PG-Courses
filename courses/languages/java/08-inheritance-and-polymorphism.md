---
title: Inheritance and polymorphism
summary: Extending a class, what dynamic dispatch does at run time, and why composition usually wins.
chapter: The type system
minutes: 13
status: draft
---

## Extending a class

```java
public class Shape {
    private final String name;

    protected Shape(String name) {
        this.name = name;
    }

    public String name() {
        return name;
    }

    public double area() {
        return 0;
    }
}

public final class Circle extends Shape {
    private final double radius;

    public Circle(double radius) {
        super("circle");
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}
```

The first statement of a constructor is a call to `super(...)`, written or implied. The compiler inserts
a no-argument `super()` when the superclass has one, which is why a class with only a parameterised
constructor forces its subclasses to say which one they mean.

`@Override` is optional and worth writing every time, because the compiler then fails when the signature
does not match. Remove the annotation and a typo in the method name creates a new method that nobody
calls.

## Dispatch happens at run time

```java
List<Shape> shapes = List.of(new Circle(2), new Square(3));

for (Shape shape : shapes) {
    System.out.println(shape.name() + ": " + shape.area());
}
```

```text
circle: 12.566370614359172
square: 9.0
```

The variable type is `Shape` and the call goes to the `Circle` or `Square` override, decided by the object
rather than by the variable. Java methods are virtual by default, so this is the normal case and there is
no keyword to opt in.

## Final stops the chain

```java
public final class Money { }

public class Base {
    public final void validate() { }
}
```

A `final` class cannot be extended and a `final` method cannot be overridden. Declaring a class final by
default is a good habit for anything you have not designed for extension: it prevents a subclass from
depending on behaviour you intended to be private, and it lets the JIT treat the call as non-virtual.

## Protected is wider than it looks

A `protected` member is visible to the package as well as to subclasses, so a subclass in another package
and a neighbour in the same package both see it. That is usually more access than the intent. Prefer
`private` fields with `protected` methods, or package-private classes for the collaboration inside one
package.

## Composition beats inheritance when the relationship is not "is a"

```java
public final class Report {
    private final CsvParser parser;      // has a
    private final Formatter formatter;
}
```

Inheritance is for a genuine subtype: a `Circle` is a `Shape`. Reaching for it to reuse code creates a
class that inherits every public method of its parent, including the ones it cannot honour. A subclass
that throws on a method it inherited has broken the contract the parent promised, which is the failure
mode the Liskov substitution principle names.

Delegate instead: hold the other object in a field and call it. The field is one line, and the class
publishes only the methods it actually supports.

## Check yourself

Write a base class with one overridable method and two subclasses that override it, then call the method
through a base typed variable and read the output. Remove `@Override` from one of them, rename the method
so it no longer matches, and see what the compiler stops telling you.
