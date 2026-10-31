---
title: JIT compilation and warmup
summary: Why the first thousand calls are slow, what the compiler does inside the running program, and how to benchmark it.
chapter: The JVM and performance
minutes: 14
status: draft
---

## Two compilers and an interpreter

The JVM starts by interpreting bytecode, which is slow per operation and produces a profile of what the
program actually does. A method that is called enough times is compiled by C1, which optimises quickly and
moderately, and a method that keeps being called is compiled by C2, which optimises hard and takes longer.
That is tiered compilation, and it is why a Java program gets faster over its first few seconds.

```bash
java -XX:+PrintCompilation -jar tool.jar
```

That prints a line for each compiled method, with the tier and the time it took. It is the quickest way to see
whether the hot parts of a program were compiled at all.

`-XX:TieredStopAtLevel=1` stops at C1, which makes a short lived program start sooner because it does not pay
for the C2 compilation it never uses. A command line tool that runs for a second benefits; a service that runs
for a day does not.

## Inlining is where most of the speed comes from

The compiler copies the body of a called method into the caller, which removes the call and lets the next
optimisation see both at once. That is why a chain of small methods over a collection behaves like a hand
written loop: the loop disappears into the chain and the calls disappear into the body.

Inlining a virtual call needs the compiler to know which implementation runs. When a call site sees one
implementation it inlines it and adds a check that deoptimises if another type shows up, which is why a
`List` that is always an `ArrayList` is fast and a call site that sees ten implementations is not. That last
case is called a megamorphic call site and it drops back to a table lookup.

## Escape analysis removes allocations

```java
public long total(List<Row> rows) {
    Point point = new Point(0, 0);          // may never be allocated
    return rows.stream().mapToLong(Row::value).sum();
}
```

An object that does not escape its method can have its fields turned into local variables, so no allocation
happens at all. That is why a temporary object in a hot loop is often free, and why guessing at allocation
costs from the source is unreliable. The allocation profiler shows whether the allocation survived.

## Deoptimisation undoes it

A compiled method can be thrown away and reverted to the interpreter when an assumption the compiler made
stops holding, such as a profile that saw only one implementation of an interface and then sees a second. The
compiled code has an uncommon trap at that point, and it is the reason a benchmark that only exercises one
implementation can measure something a real workload never sees.

## A hand timed loop does not measure anything useful

```java
long start = System.nanoTime();
for (int i = 0; i < 1_000_000; i++) {
    parse(input);
}
System.out.println((System.nanoTime() - start) / 1_000_000 + " ms");
```

That number is wrong for at least five reasons: no warmup, so it measures the interpreter and the compiler;
the JIT may remove the work if nothing uses the result; loop unrolling changes what ran; the loop may be on the
stack for the whole run; and a single run on a machine that is doing something else is noise.

## JMH measures it properly

```groovy
plugins {
    id 'me.champeau.jmh' version '0.7.2'
}
```

```java
@Benchmark
@Warmup(iterations = 3, time = 1)
@Measurement(iterations = 5, time = 1)
@Fork(2)
public List<String> parse(Blackhole blackhole) {
    List<String> rows = parser.parse(input);
    blackhole.consume(rows);
    return rows;
}
```

```bash
./gradlew jmh
```

JMH forks a fresh JVM per configuration, warms each one up, measures several iterations, and reports a
confidence interval. `Blackhole.consume` makes the result used, so the compiler cannot delete the work. The
`@Fork` value of two runs the whole thing twice in separate processes, which catches a result that depends on
one machine's state.

Three rules for a useful benchmark: measure the code you ship, with the data you have, in the profile you
deploy. A benchmark on a thousand rows in the dev profile is a number about nothing.

## Startup time is a separate problem

```bash
java -XX:ArchiveClassesAtExit=tool.jsa -jar tool.jar
java -XX:SharedArchiveFile=tool.jsa -jar tool.jar
```

A class data sharing archive records the parsed classes from one run and reuses them, which cuts startup for a
program that is launched often. `jlink` goes further and builds a runtime image containing only the modules the
program needs, which shrinks both the download and the start time. Both trade a build step for a faster start
and are worth it for a command line tool and rarely worth it for a service.

## Check yourself

Time a small loop that calls a method a thousand times and again after ten million calls, and explain the
difference. Then move the same code into a JMH benchmark with warmup iterations and compare the numbers.
