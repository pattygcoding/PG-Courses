---
title: Threads and executors
summary: Starting work on another thread, the pool that should have started it instead, and how a task reports a failure.
chapter: Concurrency
minutes: 14
status: draft
---

## A thread runs a Runnable

```java
Thread worker = new Thread(() -> System.out.println("running"));
worker.start();
worker.join();
```

`start` schedules the thread and returns, and `join` waits for it to finish. Calling `run` instead of `start`
runs the body on the calling thread, which is a mistake the compiler cannot catch.

Creating a thread per task costs about a megabyte of stack and a system call, so it does not scale past a few
hundred. An executor holds a pool of threads and hands each one a queue of tasks.

## The executor is the way to run background work

```java
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (Row row : rows) {
        pool.submit(() -> process(row));
    }
}
```

`ExecutorService` implements `AutoCloseable` in Java 19 and later, so a try-with-resources block waits for
the queued tasks and shuts the pool down on the way out. Before that the pattern was `shutdown` in a `finally`
followed by `awaitTermination`.

The factories and their uses:

| Factory | For |
| --- | --- |
| `newFixedThreadPool(n)` | a known, limited concurrency |
| `newCachedThreadPool()` | many short tasks, unbounded threads, rarely the right choice |
| `newSingleThreadExecutor()` | serialising work on one background thread |
| `newScheduledThreadPool(n)` | delayed and repeated tasks |
| `newVirtualThreadPerTaskExecutor()` | one virtual thread per task, for blocking work |

## A task that returns a value is a Callable

```java
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    Future<Long> future = pool.submit(() -> count(rows));

    try {
        long total = future.get(5, TimeUnit.SECONDS);
        System.out.println(total);
    } catch (TimeoutException e) {
        future.cancel(true);
    } catch (ExecutionException e) {
        throw new RuntimeException("count failed", e.getCause());
    }
}
```

`Future.get` blocks until the task finishes, and it throws `ExecutionException` wrapping whatever the task
threw. That wrapping is why a failure inside a submitted task does not print anything on its own: nothing
reads the `Future`, so nothing reports the exception. Log inside the task or always call `get`.

`get` with a timeout is the version to use in a service, because a task that hangs otherwise hangs the caller
for as long as the pool lives.

## Interruption is cooperative

```java
try {
    Thread.sleep(1000);
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
    return;
}
```

Interrupting a thread sets a flag, and a blocking call notices the flag and throws `InterruptedException`. The
exception clears the flag, so code that catches it and continues has silently discarded the request to stop.
Restoring it with `interrupt()` and returning is the convention: your method stops, and the caller sees the
flag and stops too.

A loop doing work rather than waiting checks the flag itself:

```java
while (!Thread.currentThread().isInterrupted()) {
    process(queue.take());
}
```

## Sizing the pool

A CPU bound task wants about as many threads as there are cores, since more threads only add context
switching. A task that spends most of its time waiting on a network call wants more threads than cores, and
the right number is a measurement rather than a formula.

```java
int cores = Runtime.getRuntime().availableProcessors();
```

A virtual thread per task is the answer for blocking work, because it costs a few hundred bytes rather than a
megabyte, and the runtime parks it while it waits. That is the next but one page.

## Thread local state

```java
private static final ThreadLocal<Formatter> FORMATTER =
        ThreadLocal.withInitial(Formatter::new);
```

A `ThreadLocal` gives each thread its own copy of a value, which is how a formatter or a transaction context
is kept without passing it through every signature. In a pool the thread outlives the task, so the value
stays alive and is seen by the next task unless it is cleared. For a request-scoped value in a service, set
it at the start, clear it in a `finally`, and prefer passing the value as an argument where you can.

## Check yourself

Submit ten tasks to a fixed pool of four threads, have each print its thread name, and confirm they share the
four. Then submit a task that throws, read what happens when you ignore the `Future`, and repeat with `get`
and catch the wrapping.
