---
title: Immutable objects and builders
summary: Values that cannot change, how to keep them that way, and the constructor that needed a builder.
chapter: Objects and data
minutes: 13
status: draft
---

## What immutability buys

An object that cannot change can be shared between threads with no synchronisation, stored in a `HashMap`
without its hash going stale, and passed to a method knowing the method cannot alter it. Most bugs about
shared state come from an object changing when a caller did not expect it.

```java
public final class Window {
    private final Instant from;
    private final Instant to;
    private final List<String> tags;

    public Window(Instant from, Instant to, List<String> tags) {
        this.from = Objects.requireNonNull(from, "from");
        this.to = Objects.requireNonNull(to, "to");
        this.tags = List.copyOf(tags);
    }

    public List<String> tags() {
        return tags;
    }
}
```

Four things make it immutable: the class is `final` so nobody can add mutable state, the fields are
`private final` so nothing reassigns them, `List.copyOf` takes a copy so a caller cannot keep a reference
and mutate it afterwards, and the accessor returns the copy rather than exposing a field. Skip the copy
and the object is immutable in name only.

`List.copyOf`, `Set.copyOf` and `Map.copyOf` return unmodifiable collections and reject nulls. For an
array, `Arrays.copyOf` in the constructor and again in the getter is the pair that closes the hole.

## Records are immutable, with one caveat

```java
public record Window(Instant from, Instant to, List<String> tags) {
    public Window {
        tags = List.copyOf(tags);
    }
}
```

The compact constructor reassigns the parameter, and the assignment to the field then uses the copy. This
is necessary because a record's immutability is only as deep as its components: `final` on a `List` field
stops the reference changing and says nothing about the list's contents.

## A modified copy keeps the type usable

```java
public Window withTags(List<String> tags) {
    return new Window(from, to, tags);
}
```

Immutable types are awkward without a way to produce a changed one, and `withX` methods are the convention.
They allocate, so a loop that calls twenty of them allocates twenty objects. That is a real cost and the
right trade in most code, since the alternative is a shared mutable object and the bug it causes.

## A builder for many optional parameters

```java
public final class Query {
    private final String table;
    private final int limit;
    private final List<String> where;

    private Query(Builder builder) {
        this.table = builder.table;
        this.limit = builder.limit;
        this.where = List.copyOf(builder.where);
    }

    public static Builder on(String table) {
        return new Builder(table);
    }

    public static final class Builder {
        private final String table;
        private int limit = 100;
        private final List<String> where = new ArrayList<>();

        private Builder(String table) {
            this.table = Objects.requireNonNull(table, "table");
        }

        public Builder limit(int limit) {
            if (limit <= 0) {
                throw new IllegalArgumentException("limit must be positive: " + limit);
            }
            this.limit = limit;
            return this;
        }

        public Builder where(String clause) {
            where.add(Objects.requireNonNull(clause, "clause"));
            return this;
        }

        public Query build() {
            return new Query(this);
        }
    }
}
```

```java
Query query = Query.on("rows").limit(50).where("size > 1024").build();
```

Each setter returns `this`, so the calls chain, and each one validates the value it accepts. The
constructor is private, so a `Query` can only come from `build()`, which is where any check that needs all
the values together belongs.

Reach for a builder when a constructor would take more than about four arguments or when most of them are
optional. Below that, a record with named components reads better and is a third of the code.

## Static factories instead of constructors

```java
public static Window of(Instant from, Instant to) {
    return new Window(from, to, List.of());
}

public static Window empty() {
    return new Window(Instant.EPOCH, Instant.EPOCH, List.of());
}
```

A static factory can have a name that says what it returns, which a constructor cannot have two versions
of. `List.of`, `LocalDate.of` and `Optional.empty` are the standard library using the same idea.

## Check yourself

Write an immutable class holding a list, keep a reference to the list you passed in, and mutate it after
construction. Then add the `List.copyOf` calls and confirm the object no longer changes. Replace the
constructor call in one place with a builder and compare the call site.
