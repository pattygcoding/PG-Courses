---
title: Method references
summary: The four shapes of ::, when it reads better than a lambda, and when it does not.
chapter: Functional interfaces
minutes: 12
status: draft
---

## Four kinds

```java
Function<String, Integer> parse = Integer::parseInt;          // static method
Consumer<String> print = System.out::println;                  // instance of a named object
Function<String, Integer> length = String::length;             // instance of the argument
Supplier<List<Row>> empty = ArrayList::new;                    // constructor
```

The third kind is the one that reads oddly first. `String::length` is a function that takes a `String` and
calls `length` on it, so the argument becomes the receiver. That is why `Row::key` works as a key extractor
and looks like a field access.

Constructor references come in the same shape: `ArrayList::new` for a `Supplier`, `Row[]::new` for an
`IntFunction<Row[]>`, and `TreeMap::new` for a map supplier.

## Where it reads better than a lambda

```java
List<String> keys = rows.stream()
        .map(Row::key)
        .toList();

rows.sort(Comparator.comparing(Row::key).thenComparingLong(Row::value));
```

A method reference names an existing method, so a reader can go to it. The lambda form
`row -> row.key()` repeats the parameter name for no gain. Both compile to the same call, so this is
entirely about the reader.

```java
rows.forEach(System.out::println);
rows.removeIf(Row::isBlank);
```

## Where the lambda is better

```java
rows.sort(Comparator.comparing(row -> row.key.length()));
```

A method reference cannot express an operation, only a call. As soon as you need an argument in a different
position, a comparison, or a default, the lambda is the only form:

```java
Function<Row, String> label = row -> row.key() + ":" + row.value();
Function<String, String> trim = value -> value.strip().toLowerCase(Locale.ROOT);
```

A lambda is also better when the parameter name carries meaning. `value -> value.orElse(0)` says more than
a reference would, and the name is the documentation.

## The receiver can be this

```java
public final class Report {
    private final List<Row> rows = new ArrayList<>();

    public boolean anyLarge() {
        return rows.stream().anyMatch(this::isLarge);
    }

    private boolean isLarge(Row row) {
        return row.value() > 1024;
    }
}
```

`this::isLarge` binds the current instance as the receiver, which is the readable way to name a private
helper as a predicate. Using `Report::isLarge` would compile as an unbound reference and mean the same
thing only because the argument happens to be a `Row`.

## Overloads need a lambda to disambiguate

```java
BinaryOperator<String> pick = (a, b) -> a.length() >= b.length() ? a : b;
```

When a method name is overloaded, the compiler infers which one from the target type. That works when the
types differ enough and fails with a message about an ambiguous method reference when they do not. Writing
the lambda with explicit parameter types is the fix and easier to read than a cast.

## Check yourself

Rewrite three lambdas in your own code as method references, then find one where the lambda is clearer and
say why. Write a constructor reference for a `Supplier` and a reference to a private helper with `this::`.
