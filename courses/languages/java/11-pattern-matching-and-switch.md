---
title: Pattern matching and switch
summary: Switch expressions, type patterns and record patterns, and the exhaustiveness the compiler can prove.
chapter: The type system
minutes: 14
status: draft
---

## The switch statement and its traps

```java
switch (level) {
    case QUIET:
        System.out.println("nothing to say");
        break;
    case LOUD:
        System.out.println("shouting");
        break;
    default:
        System.out.println("normal");
}
```

Falling through happens when you forget a `break`, and the compiler does not warn. A missing case is not
an error either, so a new enum constant silently lands in `default` or in no branch at all. The arrow form
removes both problems.

## A switch expression produces a value

```java
String label = switch (level) {
    case QUIET -> "nothing to say";
    case NORMAL -> "normal";
    case LOUD -> "shouting";
};
```

There is no fallthrough, so no `break` is needed, and the expression is exhaustive: adding a fourth
constant to `Level` makes this fail to compile until you handle it. A branch with a block uses `yield` to
produce its value:

```java
int volume = switch (level) {
    case QUIET -> 0;
    case NORMAL -> 1;
    case LOUD -> {
        int boost = 2;
        yield 1 + boost;
    }
};
```

## Patterns match on type

```java
if (shape instanceof Circle circle) {
    System.out.println(circle.area());
}
```

A type pattern declares the variable and performs the cast, so there is nothing to cast and no window in
which the value could be the wrong type. The variable is in scope for the rest of the branch:

```java
if (event instanceof Finished finished && finished.ok()) {
    report(finished);
}
```

## Record patterns pull a value apart

```java
String describe(Event event) {
    return switch (event) {
        case Started(Instant at, long id) -> "started " + id;
        case Finished(Instant at, boolean ok) -> ok ? "finished" : "failed";
        case Skipped(Instant at) -> "skipped";
    };
}
```

Each case destructures the record in the same order as its components. With a sealed interface the switch
needs no `default`, and the compiler proves it covers every variant. That combination is the clearest way
to express a closed set of outcomes.

## Guards add a condition to a case

```java
String size(long bytes) {
    return switch (bytes) {
        case 0 -> "empty";
        case long b when b < 1024 -> "small";
        default -> "large";
    };
}
```

The `when` clause runs after the pattern matches, and the arms are tried in order, so a broad arm above a
narrow one makes the narrow one unreachable. The compiler reports the unreachable case rather than
quietly ignoring it.

## Null in a switch

```java
String safe = switch (value) {
    case null -> "missing";
    case "" -> "empty";
    default -> value;
};
```

Before Java 21 a `switch` on a null threw, which is why so much old code null-checks first. `case null`
makes the missing case explicit and fails with the compiler's help rather than at run time.

## Check yourself

Rewrite one switch statement as a switch expression with arrow labels, add a fourth enum constant, and
confirm the compiler names every place that needs a new branch. Then write a record pattern that
destructures two levels of records in one case.
