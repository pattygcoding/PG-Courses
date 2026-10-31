---
title: Classes, records and enums
summary: The three shapes for holding data, and when each one is the right choice.
chapter: The type system
minutes: 14
status: draft
---

## A class with fields and a constructor

```java
public final class Row {
    private final String key;
    private final long value;

    public Row(String key, long value) {
        this.key = Objects.requireNonNull(key, "key");
        this.value = value;
    }

    public String key() {
        return key;
    }

    public long value() {
        return value;
    }
}
```

`final` fields mean the object cannot change after construction, and the `Objects.requireNonNull` in the
constructor is where a bad argument is rejected, at the call site that supplied it. Without `equals` and
`hashCode` this class compares by identity, which the equality page covers.

## A record does that for you

```java
public record Row(String key, long value) {
    public Row {
        Objects.requireNonNull(key, "key");
        if (value < 0) {
            throw new IllegalArgumentException("value must not be negative: " + value);
        }
    }

    public boolean isLarge() {
        return value > 1_000_000;
    }
}
```

A record declares its components in the header and generates the constructor, the accessors named after
each component, `equals`, `hashCode` and `toString`. The block with no parameter list is the compact
constructor, which runs before the fields are assigned and is the place for validation. Additional
methods are allowed; additional instance fields are not.

Two things to know. Records are shallowly immutable, so a record holding a `List` still exposes a
mutable list unless the compact constructor copies it. And `equals` compares components, so two records
with different mutable contents compare equal at the moment you check and are never useful as map keys
if they change afterwards.

Use a record for a value that is defined by its data: a parsed row, a coordinate, an API response, a
pair. Use a class when the object has identity that outlives its fields.

## An enum is a class with a fixed set of instances

```java
public enum Level {
    QUIET(0),
    NORMAL(1),
    LOUD(2);

    private final int rank;

    Level(int rank) {
        this.rank = rank;
    }

    public int rank() {
        return rank;
    }

    public boolean louderThan(Level other) {
        return rank > other.rank;
    }
}
```

An enum constant may carry fields, and each one may override a method, which is how a small state machine
or a set of behaviours is expressed without a switch somewhere else:

```java
public enum Shape {
    CIRCLE {
        @Override
        public double area(double size) {
            return Math.PI * size * size;
        }
    };

    public abstract double area(double size);
}
```

`values()` returns a fresh array each call, so cache it rather than calling it in a loop. `valueOf` throws
on an unknown name and is the wrong way to parse input that may be wrong. `EnumSet` and `EnumMap` are
backed by bit vectors and arrays and are the fast containers for enum keys.

The `ordinal()` method reflects declaration order and changes when you reorder the constants, so never
persist it. Store the `name()`, or better, give the constant an explicit code.

## Check yourself

Write the `Row` class, then replace it with a record and note the lines that disappeared. Add an enum
with a field and a method, switch on it, and confirm the compiler reports an error when you add a fourth
constant without handling it.
