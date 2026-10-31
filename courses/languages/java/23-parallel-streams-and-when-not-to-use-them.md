---
title: Parallel streams and when not to use them
summary: The one call that splits work across cores, the cases it helps, and the ones it makes slower.
chapter: Collections and streams
minutes: 13
status: draft
---

## parallel() is one call

```java
long total = rows.parallelStream()
        .mapToLong(Row::value)
        .sum();
```

`parallel()` on a stream splits the source into chunks and runs the pipeline on the common fork-join pool,
which by default has one thread per core. The code looks the same as the sequential version, which is both
the appeal and the danger: nothing in the call site says four threads will now touch the data.

## It helps when four things are true

1. There is enough data to be worth splitting, which in practice means thousands of elements and real work
   per element.
2. The work per element is CPU bound and roughly equal in size.
3. Nothing in the pipeline blocks, shares mutable state or writes to the same place.
4. The source splits well, which an `ArrayList` or an array does and a `LinkedList` does not.

```java
Map<String, Long> totals = rows.parallelStream()
        .collect(Collectors.groupingByConcurrent(
                Row::key,
                Collectors.summingLong(Row::value)));
```

A parallel stream into a non-concurrent collector still works, because the framework merges partial
results, but a `groupingByConcurrent` avoids the merge step.

## It hurts in the cases you would not guess

```java
long total = rows.parallelStream()
        .map(row -> lookupFromDatabase(row))     // blocks, holds a pool thread
        .count();
```

A blocking call inside a parallel stream occupies a fork-join worker while it waits, so the pool runs out
of threads and the whole machine does less work than the sequential version. Blocking work belongs on an
executor sized for it, which the concurrency chapter covers.

Three more:

- **Contention.** A shared `ArrayList` that every element appends to needs a lock per append, so the
  parallel version is slower and may be wrong.
- **Ordering.** `findFirst` and `forEachOrdered` force the pipeline to respect encounter order, which undoes
  the parallelism.
- **Pool sharing.** The common pool is shared process wide, so a request handler that starts a parallel
  stream competes with every other one.

## Side effects make it silently wrong

```java
List<Row> collected = new ArrayList<>();

rows.parallelStream().forEach(collected::add);      // lost updates
```

The sequential version of that line works, which is how the bug reaches production. A parallel stream may
call the lambda from several threads, and an unsynchronised `ArrayList` loses entries. The collect form is
correct and the same length:

```java
List<Row> collected = rows.parallelStream().toList();
```

## Measure it, then decide

```java
long start = System.nanoTime();
// the pipeline
long elapsed = System.nanoTime() - start;
```

A quick timing on real data settles the question in a minute, and the answer is frequently that the
sequential version is equal or faster. A JVM benchmark needs warm-up and several runs to be trustworthy,
which the JVM chapter covers. Until you have numbers, a sequential stream is the safer default: it is
easier to read, easier to debug, and it cannot introduce a data race.

## Check yourself

Time a sequential and a parallel stream over a million integers doing a small amount of arithmetic per
element, then repeat with a thousand integers. Then change a `forEach` that appends to a shared list into a
`toList()` and explain what the parallel version was doing wrong.
