---
title: Custom exceptions and translating them
summary: Writing an exception a caller can act on, and where a failure changes shape as it crosses a boundary.
chapter: Errors, resources and diagnostics
minutes: 13
status: draft
---

## Write one when the caller distinguishes it

```java
public class InvalidRecordException extends RuntimeException {
    private final int line;

    public InvalidRecordException(int line, String message, Throwable cause) {
        super(message, cause);
        this.line = line;
    }

    public int line() {
        return line;
    }
}
```

The test is whether a caller ever writes a `catch` for it. If the answer is no, a standard exception with a
good message is the better choice, because every custom type is another thing a reader has to look up.

Extending `RuntimeException` keeps the failure out of every signature up the stack, which suits an internal
failure the application cannot continue past. Extending `Exception` is for a failure the immediate caller
can genuinely recover from, such as a retry with different input.

## Carry the data the handler needs

The line number above is there because the report that prints the failure wants to name it. An exception
that holds only a message forces the handler to parse the text, which breaks the moment the message is
reworded. Put the fields in the exception and build the message from them.

```java
public InvalidRecordException(int line, Throwable cause) {
    super("line " + line + ": " + cause.getMessage(), cause);
    this.line = line;
}
```

## A sealed hierarchy for a closed set of failures

```java
public sealed class ParseFailure extends RuntimeException
        permits MissingField, BadNumber, BadEncoding {
}

public final class MissingField extends ParseFailure {
    public MissingField(String field) {
        super("missing field: " + field);
    }
}
```

Callers can then switch over the possibilities with no `default` branch, at the cost of adding a class per
case. That trade pays off when the handling genuinely differs per case and the set of cases is yours to
control.

## Translate at the boundary

A file reader converts its failures into the domain's vocabulary once, at the edge, so nothing inside the
program handles `IOException`:

```java
public List<Row> load(Path path) {
    try {
        return parse(Files.readAllLines(path, StandardCharsets.UTF_8));
    } catch (IOException e) {
        throw new UncheckedIOException("cannot read " + path, e);
    }
}
```

The same idea at a larger scale: a repository throws a domain exception, and the HTTP layer maps it to a
status code. Keeping the translation in one place means the domain does not know about HTTP and the status
codes are decided in a layer that can see all of them.

## Validation versus an exception

```java
public Window(Instant from, Instant to) {
    Objects.requireNonNull(from, "from");

    if (to.isBefore(from)) {
        throw new IllegalArgumentException("to must not be before from: " + to + " < " + from);
    }
}
```

An argument that is wrong is a `NullPointerException` or an `IllegalArgumentException` thrown from the
constructor, and a state that is wrong is an `IllegalStateException`. Using exceptions this way documents
the invariant at the point it is enforced, and it fails where the mistake was made rather than three calls
later.

## Exceptions are not control flow

```java
try {
    return Integer.parseInt(text);
} catch (NumberFormatException e) {
    return 0;
}
```

That pattern appears often and it costs: constructing an exception captures a stack trace, which is
expensive next to a regular expression test. Where a missing value is an expected case, test for it:

```java
if (!NUMBER.matcher(text).matches()) {
    return 0;
}
```

Reach for the exception when the case is genuinely exceptional, which is once in a thousand calls rather
than once in three.

## Check yourself

Write a custom exception carrying an extra field, throw it from a parser with the original exception as its
cause, and print the cause chain. Then replace a parse-and-catch with a pre-check and note what the code
says about the expected input.
