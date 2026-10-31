---
title: CompletableFuture
summary: Composing asynchronous steps, combining results, and the executor that runs them by default.
chapter: Concurrency
minutes: 14
status: draft
---

## Future is a handle you can only block on

```java
Future<Long> future = pool.submit(() -> count(rows));

long total = future.get();          // waits here
```

A `Future` has no way to say "when this finishes, do that", so every composition becomes a `get` followed by
a decision, and the calling thread waits. `CompletableFuture` adds both: composition without blocking, and a
value that can be completed by anything.

## Starting asynchronous work

```java
CompletableFuture<String> body = CompletableFuture.supplyAsync(() -> fetch(url));

CompletableFuture<Void> log = CompletableFuture.runAsync(() -> System.out.println("done"));
```

`supplyAsync` takes a `Supplier` and returns a future of its result, and `runAsync` takes a `Runnable` and
returns a future with no value. With no executor argument both use the common fork-join pool, which is sized
for CPU bound work and shared with parallel streams. A blocking call, such as an HTTP request, belongs on its
own executor:

```java
try (ExecutorService io = Executors.newFixedThreadPool(16)) {
    CompletableFuture<String> body = CompletableFuture.supplyAsync(() -> fetch(url), io);
}
```

## Chaining the next step

```java
CompletableFuture<Integer> length = CompletableFuture
        .supplyAsync(() -> fetch(url))
        .thenApply(String::length)
        .thenApply(value -> value * 2);
```

| Method | Takes | Use it when |
| --- | --- | --- |
| `thenApply` | a `Function` returning a value | transforming the result |
| `thenAccept` | a `Consumer` | using the result and returning nothing |
| `thenRun` | a `Runnable` | doing something after, ignoring the result |
| `thenCompose` | a `Function` returning a future | the next step is itself asynchronous |

The `thenCompose` case is the one people get wrong:

```java
CompletableFuture<CompletableFuture<String>> nested = body.thenApply(this::fetchAgain);
CompletableFuture<String> flat = body.thenCompose(this::fetchAgain);
```

`thenApply` with a function that returns a future gives a future of a future, which is awkward to use and a
sign the wrong method was called.

## Combining two

```java
CompletableFuture<String> first = CompletableFuture.supplyAsync(() -> fetch(a));
CompletableFuture<String> second = CompletableFuture.supplyAsync(() -> fetch(b));

CompletableFuture<String> both = first.thenCombine(second, (left, right) -> left + right);
```

`thenCombine` runs the two independently and joins the results. Two calls that each take 200 milliseconds
finish in about 200 rather than 400, which is the whole reason to reach for this.

```java
CompletableFuture<Void> all = CompletableFuture.allOf(first, second);
String any = CompletableFuture.anyOf(first, second).join().toString();
```

`allOf` completes when every future has, and `anyOf` when the first one has. `allOf` returns
`CompletableFuture<Void>`, so getting the values out means calling `join` on each of the originals.

## Failures travel as a CompletionException

```java
CompletableFuture<Integer> safe = CompletableFuture
        .supplyAsync(() -> fetch(url))
        .thenApply(String::length)
        .exceptionally(problem -> {
            log.warn("fetch failed", problem);
            return 0;
        });
```

`exceptionally` recovers and supplies a value, so the chain continues. `handle` takes both the value and the
failure and always runs, returning a new value either way:

```java
CompletableFuture<Integer> length = body.handle((text, problem) ->
        problem == null ? text.length() : 0);
```

`whenComplete` runs on both paths and passes the result through unchanged, which is the place for a metric or
a log line. An exception thrown inside a stage wraps the original in a `CompletionException`, so read
`getCause()` to find what actually failed.

## A timeout is not optional

```java
CompletableFuture<String> body = CompletableFuture
        .supplyAsync(() -> fetch(url), io)
        .orTimeout(5, TimeUnit.SECONDS)
        .exceptionally(problem -> "unavailable");
```

A future that never completes holds whatever waits on it forever, and the pool thread stays busy. `orTimeout`
completes the future exceptionally after a timeout, and `completeOnTimeout` supplies a value instead.

## When sequential code is the better answer

```java
try (ExecutorService io = Executors.newVirtualThreadPerTaskExecutor()) {
    Future<String> first = io.submit(() -> fetch(a));
    Future<String> second = io.submit(() -> fetch(b));

    String combined = first.get() + second.get();
}
```

With virtual threads, two blocking calls written in order and each `get` costing nothing means the
composition machinery is unnecessary. `CompletableFuture` earns its keep for a chain that is assembled
dynamically or a fan out over hundreds of tasks, and it makes the code longer for two calls.

## Check yourself

Run two simulated 200 millisecond calls sequentially and then with `thenCombine`, and print the elapsed time
for each. Add `orTimeout` to one that never finishes, and handle the failure with `exceptionally`.
