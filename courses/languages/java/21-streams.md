---
title: Streams
summary: A pipeline that does nothing until a terminal operation runs, and the operations worth knowing.
chapter: Collections and streams
minutes: 14
status: draft
---

## A stream is a pipeline, not a container

```java
List<String> longKeys = rows.stream()
        .map(Row::key)
        .filter(key -> key.length() > 4)
        .sorted()
        .toList();
```

Each call adds a stage, and nothing is computed until `toList` runs. That is what lazy means here: two
`filter` stages cost one pass over the data rather than two, and a `limit` after a `filter` stops the source
as soon as enough elements have passed.

A stream holds no data. It reads from a collection, an array, a file or a generator, and it can be consumed
once:

```java
Stream<String> keys = rows.stream().map(Row::key);
keys.forEach(System.out::println);
keys.forEach(System.out::println);        // IllegalStateException: stream has already been operated upon
```

## Creating one

```java
rows.stream()                                  // from a collection
Stream.of("a", "b")                             // from values
Arrays.stream(array)                            // from an array
IntStream.range(0, 10)                          // 0 to 9
IntStream.rangeClosed(1, 10)                    // 1 to 10
Files.lines(path, StandardCharsets.UTF_8)        // from a file
```

`IntStream.range` produces primitives, so a loop generating numbers uses it rather than a `List<Integer>`.

## The stages you will use most

```java
rows.stream()
        .filter(row -> row.value() > 0)
        .map(Row::key)
        .distinct()
        .sorted()
        .limit(10)
        .forEach(System.out::println);
```

| Stage | What it does |
| --- | --- |
| `filter` | keeps the elements matching a predicate |
| `map` | transforms each element |
| `flatMap` | replaces each element with the contents of a stream |
| `distinct` | removes duplicates, using `equals` and `hashCode` |
| `sorted` | orders by the natural order or a comparator |
| `limit` and `skip` | truncate and offset |
| `peek` | runs an action and passes the element on, for debugging |

`peek` exists to put a print or a breakpoint in the middle of a pipeline. Using it to change state is a
mistake, since it is not guaranteed to run for every element once a short-circuiting stage is involved.

## Terminals make it run

```java
long count = rows.stream().filter(Row::isLarge).count();
boolean any = rows.stream().anyMatch(row -> row.value() < 0);
Optional<Row> first = rows.stream().filter(Row::isLarge).findFirst();
long total = rows.stream().mapToLong(Row::value).sum();
```

`anyMatch` stops at the first match, which makes it cheaper than filtering and comparing to zero. `count`,
`sum`, `min`, `max` and `average` are the numeric reductions, and `average` returns an `OptionalDouble`
because an empty stream has no average.

```java
long total = rows.stream()
        .mapToLong(Row::value)
        .reduce(0L, Long::sum);
```

`mapToLong` gives a `LongStream`, so the values are added without boxing, and `sum` on it is a single
terminal. Reaching for `reduce` with a lambda here is slower and easier to get wrong than `sum`.

## Primitive streams exist to avoid boxing

```java
IntSummaryStatistics stats = rows.stream()
        .mapToInt(row -> (int) row.value())
        .summaryStatistics();

System.out.println(stats.getCount() + " " + stats.getAverage());
```

A `Stream<Integer>` allocates an `Integer` per element. `IntStream`, `LongStream` and `DoubleStream` carry
primitives, and `summaryStatistics` computes count, sum, min, max and average in one pass. Convert back
with `boxed()` when a stage needs objects.

## Stream or loop

A short pipeline that reads as a sentence, such as filter, map and collect, is easier to read than the
equivalent loop. A pipeline with four nested lambdas, a captured mutable variable or a control flow that
needs `break` is not:

```java
// A loop says this more clearly than a stream would.
for (Row row : rows) {
    if (row.value() > limit) {
        total += row.value();
    } else if (total > 0) {
        break;
    }
}
```

Choose the form a reader can follow in one pass. Performance almost never decides it, since both compile to
a loop over the same data.

## Check yourself

Write a pipeline that filters, maps, sorts and collects, then add `peek` before the terminal to confirm no
output appears until the terminal runs. Then convert one pipeline back to a `for` loop and say which version
you would rather review.
