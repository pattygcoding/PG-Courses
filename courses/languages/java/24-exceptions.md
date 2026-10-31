---
title: Exceptions
summary: Checked and unchecked failures, the catch that loses the cause, and how to translate at a boundary.
chapter: Errors, resources and diagnostics
minutes: 14
status: draft
---

## A thrown exception leaves the method

```java
public long sizeOf(Path path) throws IOException {
    return Files.size(path);
}
```

`throws IOException` is part of the signature, and a caller must handle it or declare it too. That is a
checked exception: the compiler reports it, so a failure the caller can act on gets a decision rather than
an accident.

A `RuntimeException` is unchecked and appears in no signature. `NullPointerException`,
`IllegalArgumentException`, `IllegalStateException`, `IndexOutOfBoundsException` and
`NumberFormatException` are the ones you meet most.

## Which to use

| Kind | Use it for |
| --- | --- |
| Checked | a failure the caller can plausibly recover from or must report, such as a missing file |
| Unchecked | a bug in the calling code, such as a null where a value was required |

A method that throws a checked exception is telling the caller it has a decision to make. When the answer
is always "give up", the checked exception adds a `throws` clause to every method up the stack and nothing
else, which is why most modern Java code uses unchecked exceptions for internal failures and translates at
the boundaries of the application.

## Catch the specific type

```java
try {
    return parse(line);
} catch (NumberFormatException e) {
    throw new InvalidRecordException("not a number: " + line, e);
} catch (IllegalArgumentException | IllegalStateException e) {
    throw new InvalidRecordException("bad record: " + line, e);
}
```

Catching `Exception` catches a null pointer from your own typo as well as the failure you expected, which
turns a clear bug into a handled case. Catch the narrowest type that covers the failure, and catch several
unrelated ones with `|` when they need the same handling.

## Never lose the cause

```java
catch (IOException e) {
    throw new UncheckedIOException(e);              // keeps the stack trace
}
```

```java
catch (IOException e) {
    throw new UncheckedIOException(e.getMessage(), e);   // keeps it and adds to it
}
```

Passing the original exception as the second argument to a constructor keeps the cause chain, which is what
the stack trace prints after "Caused by". Building a new exception from only the message drops the original
stack trace and leaves the reader with the place the translation happened.

## try-with-resources closes what it opened

```java
try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
    String line;
    while ((line = reader.readLine()) != null) {
        process(line);
    }
}
```

Anything implementing `AutoCloseable` can be declared in the parentheses, `close` is called on the way out
whether or not an exception was thrown, and a close that fails does not hide the exception from the body.
The resources close in reverse order.

## finally is for the last resort

```java
Lock lock = new ReentrantLock();
lock.lock();
try {
    update();
} finally {
    lock.unlock();
}
```

A `finally` block runs on both paths, which is what a lock needs since it is not an `AutoCloseable`. Do not
return from a `finally` block or throw from one, because either replaces the exception that was on its way
out with a different outcome and erases the original failure.

## Do not catch to log and rethrow

```java
catch (IOException e) {
    log.error("failed", e);
    throw e;
}
```

That logs the same failure at every level it passes through, so one problem produces five lines and the
first one is the last place that had useful context. Log where the failure is handled, and let it travel
untouched through the layers that have nothing to add.

## Check yourself

Write a method throwing a checked exception and call it from one that declares it. Throw a
`NumberFormatException`, catch it, and print `getMessage()` and `getCause()`. Then wrap a failure without
passing the cause and compare the two stack traces.
