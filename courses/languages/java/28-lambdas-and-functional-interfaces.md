---
title: Lambdas and functional interfaces
summary: A lambda is an implementation of a single-method interface, and the capture rules that follow.
chapter: Functional interfaces
minutes: 13
status: draft
---

## A functional interface has one abstract method

```java
@FunctionalInterface
public interface RowFilter {
    boolean test(Row row);
}
```

The annotation is optional and makes the compiler reject a second abstract method, which is the check you
want on an interface meant to be implemented by a lambda. Default and static methods do not count towards
the one.

## A lambda implements it

```java
RowFilter large = row -> row.value() > 1024;
RowFilter named = (Row row) -> row.key().startsWith("report");
RowFilter block = row -> {
    long size = row.value();
    return size > 0 && size < 1024;
};
```

The compiler infers the parameter types from the target type, which is why the same lambda can implement
different interfaces depending on where it is used. A lambda is a value, so it can be stored in a field,
passed as an argument and returned from a method.

## The built-in four

| Interface | Method | Shape |
| --- | --- | --- |
| `Function<T, R>` | `R apply(T)` | takes one, returns one |
| `Consumer<T>` | `void accept(T)` | takes one, returns nothing |
| `Supplier<T>` | `T get()` | takes nothing, returns one |
| `Predicate<T>` | `boolean test(T)` | takes one, returns a boolean |

```java
Function<Row, String> key = Row::key;
Consumer<Row> print = row -> System.out.println(row);
Supplier<List<Row>> freshList = ArrayList::new;
Predicate<Row> large = row -> row.value() > 1024;
```

The `Bi` versions take two arguments: `BiFunction`, `BiConsumer`, `BiPredicate`. `UnaryOperator<T>` and
`BinaryOperator<T>` are `Function<T, T>` and `BiFunction<T, T, T>` with the types repeated, which reads
better in a signature.

## Write your own when the name carries meaning

```java
public interface PriceRule {
    BigDecimal applyTo(BigDecimal subtotal);
}
```

`Function<BigDecimal, BigDecimal>` and `PriceRule` compile to the same thing. The named interface says what
the function is for, appears in the method signature a reader sees, and gives you a place to put the
documentation. A `Function<Row, Row>` appearing six times in a public API is a sign that a name is missing.

## Capture requires effectively final variables

```java
String prefix = "report";

Predicate<Row> matches = row -> row.key().startsWith(prefix);
```

The lambda captures `prefix`, and the compiler requires that it is never reassigned, which it calls
effectively final. The value is copied at the point the lambda is created, so a later change to the
variable would not be visible and the language forbids it rather than letting it be confusing.

```java
int total = 0;
rows.forEach(row -> total += row.value());      // does not compile
```

A mutable accumulator captured by a lambda is the mistake this rule prevents. Use a stream reduction, or an
array or a field where the mutation is genuine, or a loop:

```java
long total = rows.stream().mapToLong(Row::value).sum();
```

## this inside a lambda is the enclosing object

```java
public final class Report {
    private final String name;

    public Runnable task() {
        return () -> System.out.println(this.name);     // the Report
    }
}
```

In an anonymous class, `this` refers to the anonymous class and `Report.this` is needed for the outer one.
A lambda has no `this` of its own, so `this` is the enclosing instance, which removes a class of confusion
and is one reason to prefer a lambda over an anonymous class even when the body is several lines.

## Checked exceptions do not fit

```java
Function<Path, String> read = path -> Files.readString(path);
```

That does not compile, because `Function.apply` declares no checked exceptions and `readString` throws
`IOException`. Two ways out:

```java
Function<Path, String> read = path -> {
    try {
        return Files.readString(path);
    } catch (IOException e) {
        throw new UncheckedIOException(e);
    }
};

@FunctionalInterface
interface ThrowingReader<T, R> {
    R apply(T value) throws IOException;
}
```

Wrap the failure in an unchecked exception when the caller cannot recover anyway, or declare your own
interface with a `throws` clause when they can. The standard functional interfaces cannot express a checked
exception, which is a deliberate limit rather than an oversight.

## Check yourself

Write a lambda for each of the four built-in interfaces and one custom functional interface with a name that
says what it does. Then capture a variable in a lambda, reassign it after the lambda is created, and read
the compiler error.
