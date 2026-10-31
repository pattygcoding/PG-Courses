---
title: Composing functions, predicates and comparators
summary: Building a rule out of small parts, and the point where naming the parts reads better.
chapter: Functional interfaces
minutes: 13
status: draft
---

## Functions compose left to right

```java
Function<String, String> clean = value -> value.strip().toLowerCase(Locale.ROOT);
Function<String, Integer> parse = Integer::parseInt;

Function<String, Integer> read = clean.andThen(parse);

System.out.println(read.apply("  42 "));       // 42
```

`andThen` runs this function first, then the next one. `compose` runs the argument first, so
`a.compose(b)` is `a(b(x))`, which reads right to left in the source. Pick `andThen` and stay with it,
because mixing the two in one expression is where mistakes come from.

```java
Function<String, Integer> read = parse.compose(clean);       // same result
```

`Function.identity()` returns a function that hands its argument back, which is what a method that needs a
function but has nothing to change takes.

## Predicates combine as logic

```java
Predicate<Row> large = row -> row.value() > 1024;
Predicate<Row> recent = row -> row.at().isAfter(cutoff);

Predicate<Row> worthKeeping = large.and(recent).and(Predicate.not(Row::isBlank));
```

`and`, `or` and `negate` build a compound predicate, and the result is still a value you can pass around,
name and test on its own. `Predicate.not` was added in Java 11 because `method.negate()` reads poorly with a
method reference.

Short circuiting applies: `and` stops at the first false, so a cheap check first is worth having.

## A validator from parts

```java
public final class RowValidator {
    private static final Predicate<Row> HAS_KEY = row -> !row.key().isBlank();
    private static final Predicate<Row> POSITIVE = row -> row.value() >= 0;

    private final Predicate<Row> rule = HAS_KEY.and(POSITIVE);

    public List<Row> accepted(List<Row> rows) {
        return rows.stream().filter(rule).toList();
    }
}
```

Each rule is named, testable on its own, and combined in one place where the whole condition is visible.
That is the useful pattern: the composition is one line and the parts have names.

## Comparators chain the same way

```java
Comparator<Row> order = Comparator.comparing(Row::key, Comparator.nullsLast(Comparator.naturalOrder()))
        .thenComparingLong(Row::value)
        .reversed();
```

Reach for `thenComparing` rather than a hand written `compareTo` with nested conditionals. A chain is easy
to extend, and the order of the tie breakers is visible in the source.

## Consumers chain for side effects

```java
Consumer<Row> report = printer::print;
Consumer<Row> audit = auditLog::record;

rows.forEach(report.andThen(audit));
```

`Consumer.andThen` runs both, in order. A chain of more than two consumers is usually a method that should
take a list instead, since the order matters and the chain hides it.

## Suppliers make work lazy

```java
Optional<Row> row = find(key);

Row value = row.orElseGet(this::loadDefault);
```

`orElseGet` takes a `Supplier`, so `loadDefault` runs only when the optional is empty. `orElse` takes a
value and evaluates its argument every time, which is why a method call inside `orElse` is a cost paid
whether or not it is used.

```java
Supplier<Report> report = () -> buildReport(rows);
```

A supplier passed into a method lets the method decide whether to compute, which is how a cache miss and a
fallback are expressed without the caller doing the work up front.

## Where composition stops helping

```java
Function<Row, String> pipeline = Row::key;
pipeline = pipeline.andThen(this::normalise).andThen(this::truncate).andThen(this::escape);

String label = pipeline.apply(row);
```

That is four transformations with no place to put a breakpoint, no stack frame with a name and no debugger
step that lands between them. Once a pipeline has a business rule in the middle, write the steps as named
private methods called from a method with a name:

```java
private String label(Row row) {
    String normalised = normalise(row.key());
    String truncated = truncate(normalised, 32);
    return escape(truncated);
}
```

Composition pays for a rule built from small reusable pieces, such as a filter or a comparator. A sequence
of steps that happens once is a method.

## Check yourself

Build a `Predicate<Row>` from three named predicates with `and` and one `negate`, and use it in a stream.
Then build a `Function` chain of three steps, convert it to a method with named locals, and say which version
you would rather debug.
