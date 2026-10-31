---
title: Absent values and Optional
summary: Where null belongs, what Optional promises, and the methods that keep it readable.
chapter: Objects and data
minutes: 13
status: draft
---

## null is the absence of a reference

A field or an array element holding a reference type starts as `null`, and so does anything a method
returns when it decides there is nothing to return. Reading a member of a null reference throws
`NullPointerException`, which names the line but not the origin, so the useful part of the message is
usually the "helpful NullPointerException" that newer releases add with the exact expression that was
null.

Two habits remove most null bugs: reject a null argument at the point you receive it, and never return
null where a collection or an `Optional` says the same thing better.

```java
public Row(String key, long value) {
    this.key = Objects.requireNonNull(key, "key");
    this.value = value;
}
```

## Optional means "may be absent"

```java
public Optional<Row> find(String key) {
    return Optional.ofNullable(rows.get(key));
}
```

`Optional<T>` holds either a value or nothing, and it is a return type. A type that returns `Optional`
tells the caller the absence is expected and gives them methods to handle it, which a null return does
not.

Use it for a return value. Do not use it for a field, where null is already the absent state and an
`Optional` field adds an object per instance. Do not use it for a parameter either, since a parameter type
that may be missing is better expressed as two overloads or as a null check with a clear message.

## The methods that avoid a check

```java
Row row = find(key).orElseThrow(() -> new NoSuchElementException(key));
int size = find(key).map(Row::value).orElse(0);
find(key).ifPresent(found -> System.out.println(found.key()));

List<String> keys = find(key).stream().map(Row::key).toList();
```

`orElse` takes a value that is built whether or not it is used, and `orElseGet` takes a supplier that runs
only when the value is missing. In a loop that difference is an allocation per iteration.

`map` transforms the value when it is present and passes the absence through. `flatMap` is for a function
that itself returns an `Optional`, which stops the result being an `Optional<Optional<T>>`.

`Optional` has a `stream()` method, so a method returning `Optional<Row>` drops into a pipeline that
skips the missing values:

```java
List<Row> found = keys.stream()
        .map(this::find)
        .flatMap(Optional::stream)
        .toList();
```

## Getting the value out

```java
Optional<Row> row = find(key);

if (row.isPresent()) {
    System.out.println(row.get());
}
```

`get()` throws `NoSuchElementException` when the value is absent, and its name says nothing about that, so
prefer `orElseThrow` where a missing value is a problem. Calling `get` without checking is the way an
`Optional` turns into the same failure as a null, with a less useful message.

## Primitives in a stream use the primitive optionals

```java
OptionalInt max = IntStream.of(1, 5, 3).max();
OptionalLong total = LongStream.of(1, 2).sum() == 0 ? OptionalLong.empty() : OptionalLong.of(3);
```

`OptionalInt`, `OptionalLong` and `OptionalDouble` exist because `Stream<Integer>` boxes every element,
and a stream of a million integers allocating a million `Integer` objects is slow. They have fewer methods
and no `map`, which is the trade.

## When to return null

Inside a private method called in a tight loop, a null return is fine and cheaper. Where the absence is
part of a value being built, an explicit field or a sentinel constant is clearer than an `Optional`. The
rule worth keeping is that a public method's contract should make the possibility of absence visible to
the caller, and `Optional` is one way to do that.

## Check yourself

Write a lookup returning `Optional<Row>`, then handle it with `ifPresent`, with `map` and `orElse`, and
with `orElseThrow`. Convert the same method to return a nullable value and count how many call sites the
compiler helps you fix.
