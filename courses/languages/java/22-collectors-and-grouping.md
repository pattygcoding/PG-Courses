---
title: Collectors and grouping
summary: Turning a pipeline into a map, a total or a joined string, and the exception a duplicate key throws.
chapter: Collections and streams
minutes: 13
status: draft
---

## The common collectors

```java
List<String> keys = rows.stream().map(Row::key).collect(Collectors.toList());
Set<String> unique = rows.stream().map(Row::key).collect(Collectors.toSet());

String joined = rows.stream().map(Row::key).collect(Collectors.joining(", ", "[", "]"));
```

Since Java 16 a stream has `toList()` directly, which is shorter and returns an unmodifiable list. Reach for
`Collectors.toList()` when you want a mutable result or a specific `List` implementation, and
`Collectors.toUnmodifiableList()` when you want the guarantee without the mutability.

`joining` takes an optional delimiter, prefix and suffix, which is how a comma separated report line is
built without a loop and without a trailing separator.

## toMap, and its duplicate key exception

```java
Map<String, Row> byKey = rows.stream()
        .collect(Collectors.toMap(Row::key, row -> row));
```

```text
java.lang.IllegalStateException: Duplicate key a (attempted merging values ...)
```

The two argument form throws when two elements produce the same key, which is correct behaviour and a
common surprise. Decide what a duplicate means and say so with the third argument:

```java
Map<String, Long> totals = rows.stream()
        .collect(Collectors.toMap(Row::key, Row::value, Long::sum));
```

The optional fourth argument supplies a map supplier, which is how a `TreeMap` or a `LinkedHashMap` comes
out of a stream in the right order.

## Grouping is the one worth learning

```java
Map<String, List<Row>> byKey = rows.stream()
        .collect(Collectors.groupingBy(Row::key));

Map<String, Long> sizes = rows.stream()
        .collect(Collectors.groupingBy(Row::key, Collectors.counting()));

Map<String, Long> totals = rows.stream()
        .collect(Collectors.groupingBy(Row::key, Collectors.summingLong(Row::value)));
```

The first form gives a map of lists, which is the same thing the `computeIfAbsent` loop builds and
considerably shorter. The second and third forms take a downstream collector, so each group is reduced
rather than collected:

| Downstream | Result per group |
| --- | --- |
| `counting()` | a `Long` |
| `summingLong(...)` | a `Long` |
| `averagingInt(...)` | a `Double` |
| `mapping(...)` | a transformed value |
| `maxBy(...)` and `minBy(...)` | an `Optional` |
| `filtering(...)` | a collection matching a predicate |

```java
Map<String, Set<String>> tagsByKey = rows.stream()
        .collect(Collectors.groupingBy(
                Row::key,
                Collectors.mapping(Row::tag, Collectors.toSet())));
```

That nesting is where grouping stops reading as a sentence. A plain loop with `computeIfAbsent` is often
clearer at three levels deep, and there is no performance argument either way for a few thousand rows.

`groupingByConcurrent` gives a `ConcurrentMap` and is meant to be used with a parallel stream.

## Splitting in two

```java
Map<Boolean, List<Row>> split = rows.stream()
        .collect(Collectors.partitioningBy(Row::isLarge));
```

`partitioningBy` always returns both keys, so the `false` list exists and is empty when nothing failed the
predicate. That makes it safer than a `groupingBy` that returns a map you then have to check for a missing
key.

## Two collectors at once

```java
record Summary(long count, long total) { }

Summary summary = rows.stream()
        .collect(Collectors.teeing(
                Collectors.counting(),
                Collectors.summingLong(Row::value),
                Summary::new));
```

`teeing` runs two collectors over the same stream and combines their results, which saves a second pass
over the data. It is worth knowing about and rare enough that the alternative, two pipelines, is usually
fine for anything that fits in memory.

## Check yourself

Group rows by key twice, once with `groupingBy` and once with a `computeIfAbsent` loop, and compare the two.
Then build a `toMap` with a duplicate key and read the exception, and fix it with a merge function.
