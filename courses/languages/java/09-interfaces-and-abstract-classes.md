---
title: Interfaces and abstract classes
summary: Contracts with default methods, the sealed case, and how to choose between the two kinds of supertype.
chapter: The type system
minutes: 13
status: draft
---

## An interface is a contract

```java
public interface Summarisable {
    String summary();

    default int weight() {
        return 1;
    }
}
```

A class implements any number of interfaces, so interfaces are how Java gets multiple inheritance of
type. Every method is public and abstract unless it has a body, and a class that implements the interface
must provide the abstract methods.

## Default methods let an interface grow

```java
public interface Sink {
    void write(String line);

    default void writeAll(List<String> lines) {
        for (String line : lines) {
            write(line);
        }
    }

    private String prefix() {
        return "line: ";
    }

    static Sink discarding() {
        return line -> { };
    }
}
```

A default method has an implementation, so adding one to a published interface does not break the classes
that already implement it. That is why `Comparator.thenComparing` and the collection `stream()` methods
could arrive without a breaking release. Private methods inside an interface (Java 9 and later) hold code
shared between two defaults. Static methods give a factory or a helper without a separate class.

An interface may also declare constants, and they are implicitly `public static final`. Adding one to an
interface is a way of leaking an implementation detail into a public contract, so a class is usually the
better home.

## A sealed interface names its implementors

```java
public sealed interface Event permits Started, Finished, Skipped {
    Instant at();
}

public record Started(Instant at, long id) implements Event { }
public record Finished(Instant at, boolean ok) implements Event { }
public record Skipped(Instant at) implements Event { }
```

`sealed` with `permits` fixes the set of types that may implement the interface, and the compiler then
knows a `switch` over it can be exhaustive. That is the feature that makes pattern matching useful on a
type hierarchy.

## Abstract class or interface

| Situation | Choose |
| --- | --- |
| A contract with no shared state | interface |
| Several unrelated types must implement it | interface |
| A type that must be extended alongside another class | interface |
| Shared fields and a constructor | abstract class |
| A protected helper that subclasses call | abstract class |
| A closed set of variants you control | sealed interface |

An abstract class may hold fields, a constructor and non-public members, which an interface cannot. That
is the whole reason to prefer it: when the subtypes share state and initialisation, an abstract class
expresses that, and when they share only a name for a set of methods, an interface does.

A class extends one class and implements as many interfaces as it likes, so the two are not alternatives
in the same slot. This is the common shape: an abstract base holding the shared machinery and an
interface naming what callers depend on.

## Marker interfaces

```java
public interface Auditable { }
```

An interface with no methods marks a type for something else to act on, which is how `Serializable` and
`Cloneable` work. A modern alternative is an annotation, which can carry values. Reach for a marker
interface when the marker needs to be part of the type system, and for an annotation when it is metadata
read at run time.

## Check yourself

Write an interface with one abstract method and one default method, implement it twice, and call the
default from both. Then convert it to a sealed interface with three record implementations and switch
over the result with no `default` branch.
