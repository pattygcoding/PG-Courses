---
title: Default methods and shared behaviour
summary: Adding a method to a published interface, resolving a diamond, and the mixin shape that fits.
chapter: Functional interfaces
minutes: 13
status: draft
---

## A default method is an implementation in an interface

```java
public interface Sink {
    void write(String line);

    default void writeAll(List<String> lines) {
        lines.forEach(this::write);
    }
}
```

An implementing class gets `writeAll` without writing it, and it can override it when it has a better way to
do the same job. That is how `Iterable.forEach`, `Collection.removeIf`, `List.sort`, `Map.getOrDefault` and
`Comparator.thenComparing` were added to interfaces that millions of classes already implement.

## Good defaults derive from the abstract methods

```java
public interface Window {
    Instant from();
    Instant to();

    default Duration length() {
        return Duration.between(from(), to());
    }

    default boolean empty() {
        return !to().isAfter(from());
    }
}
```

Both defaults are computed from the two methods every implementor provides, so they can never disagree with
the data. A default that needs a field of its own cannot be written anyway, since an interface has no state,
which is what keeps this rule easy to follow.

A default that most implementors override is a sign the abstraction is wrong: the method belongs in a
separate interface, or the type should be an abstract class with the shared code in it.

## A diamond resolves in a defined order

```java
public interface A {
    default String label() {
        return "A";
    }
}

public interface B {
    default String label() {
        return "B";
    }
}

public class Both implements A, B {
    @Override
    public String label() {
        return A.super.label() + B.super.label();
    }
}
```

The compiler rejects an ambiguous call and names both candidates, so the class has to choose. Two rules apply
first: a method from a superclass wins over any interface default, and when one interface extends another the
more specific one wins. Only when neither rule decides does the class have to override.

## Default methods make interfaces mixins

```java
public interface Auditable {
    Instant createdAt();

    default boolean recent(Duration window, Clock clock) {
        return createdAt().isAfter(clock.instant().minus(window));
    }
}
```

A class can pick up several of these behaviours by implementing several interfaces, which is how Java
approximates traits. The constraints are that an interface cannot hold state, so every mixin method has to
work from methods the class already provides, and a name collision has to be resolved by hand.

Compare with an abstract class: it can hold fields, a constructor and protected helpers, and a class can
extend only one. The decision comes down to whether the shared behaviour needs state.

## Static methods give a factory or a helper

```java
public interface Sink {
    void write(String line);

    static Sink discarding() {
        return line -> { };
    }

    static Sink to(List<String> target) {
        return target::add;
    }
}
```

A static method in an interface keeps the alternative implementations next to the type they implement, so a
reader looking for a `Sink` finds all of them in one file. It also means no separate `Sinks` utility class
exists.

## Reading the JDK's own defaults

The standard library is the best source of examples of the pattern used well, and it is worth opening the
`List`, `Map`, `Comparator` and `Iterable` pages to see the shape:

| Default | Where |
| --- | --- |
| `forEach` | `Iterable` |
| `removeIf`, `stream`, `parallelStream` | `Collection` |
| `getOrDefault`, `computeIfAbsent`, `merge`, `forEach` | `Map` |
| `thenComparing`, `reversed`, `nullsFirst` | `Comparator` |
| `sort`, `replaceAll` | `List` |

Each one is derived from the abstract methods, and each one arrived without a breaking release. That is the
case for using the pattern rather than adding the method to every implementor.

## Check yourself

Add two default methods to an interface that both derive from the abstract ones, and implement the interface
once to confirm neither method needs code. Then create two interfaces with the same default method, implement
both in one class, and resolve the conflict explicitly.
