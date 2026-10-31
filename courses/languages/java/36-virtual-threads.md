---
title: Virtual threads
summary: Threads the JVM schedules, what they cost, and the one thing that stops them scaling.
chapter: Concurrency
minutes: 13
status: draft
---

## A platform thread is an operating system thread

A platform thread costs a stack of about a megabyte and a system call to create, so a few hundred is the
practical ceiling. That limit is why server code grew thread pools, callbacks and reactive frameworks: the
threads were too expensive to hold while waiting on a network round trip.

A virtual thread is scheduled by the JVM and runs on a small pool of platform threads called carriers. It
costs a few hundred bytes, so a program can have a million of them.

```java
Thread worker = Thread.ofVirtual().name("fetch-1").start(() -> fetch(url));
worker.join();
```

```java
try (ExecutorService io = Executors.newVirtualThreadPerTaskExecutor()) {
    for (String url : urls) {
        io.submit(() -> System.out.println(fetch(url)));
    }
}
```

The second form is the one to use. One virtual thread per task, no pool sizing, and the try block waits for
every task at the end.

## Blocking a virtual thread is cheap

```java
String body = fetch(url);            // parks the virtual thread, frees the carrier
```

A blocking call on a virtual thread unmounts it from its carrier, so the carrier runs another task while the
first waits. That is the change that matters: the code reads as a sequence of blocking calls, and the runtime
handles the concurrency. No continuations to write, no reactive types in the signatures.

## Pinning costs you the carrier

Two things stop a virtual thread from unmounting, and the JVM reports them with `-Djdk.tracePinnedThreads=short`:

- A blocking call made inside a `synchronized` block or method.
- A call into native code, including some file and DNS operations.

```java
synchronized (lock) {
    fetch(url);                      // the carrier is pinned for the whole call
}
```

In Java 21 to 23 a pinned thread holds its carrier while it blocks, so a thousand virtual threads blocking
inside a `synchronized` block need a thousand carriers and the advantage disappears. Replace the lock with a
`ReentrantLock` where it is held across a blocking call. Java 24 changed this so that `synchronized` no
longer pins, and knowing that is worth checking against the release you deploy on.

```java
private final ReentrantLock lock = new ReentrantLock();

lock.lock();
try {
    fetch(url);
} finally {
    lock.unlock();
}
```

## Do not pool virtual threads

A pool exists to reuse an expensive resource. A virtual thread is cheap, so pooling one adds a queue and a
limit without saving anything. `Executors.newVirtualThreadPerTaskExecutor()` is the answer, and a
`ThreadPoolExecutor` with virtual threads is worth avoiding.

```java
try (ExecutorService io = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<Long>> futures = rows.stream()
            .map(row -> io.submit(() -> count(row)))
            .toList();

    long total = 0;
    for (Future<Long> future : futures) {
        total += future.get();
    }
}
```

The `get` calls are cheap, because the task usually finished while the loop was still submitting, and the
thread that waits is itself a virtual thread when the caller is one.

## ThreadLocal gets expensive and ScopedValue is arriving

A per-thread copy of a value costs a slot per thread. With a pool of eight threads that is eight copies, and
with a million virtual threads it is a million. `ThreadLocal` still works and is worth avoiding for anything
large or long lived.

```java
static final ScopedValue<Request> CURRENT = ScopedValue.newInstance();

ScopedValue.where(CURRENT, request).run(() -> handle());
```

`ScopedValue` is in preview in recent releases, and it gives an immutable value a dynamic extent that is
inherited by virtual threads forked inside it, with no per-thread storage to clear. Check the release you
target before using it.

## When virtual threads are the wrong tool

CPU bound work gains nothing, since there are no waits to overlap, and the carrier pool is sized for the
cores either way. Use a fixed pool of platform threads for that, or a parallel stream.

A library that caches or pools its own threads, or holds a `synchronized` lock across a blocking call, can
also undo the benefit. Check for it with the pinning trace rather than by guessing, and prefer a client that
returns blocking calls the runtime can park.

## Check yourself

Run ten thousand tasks that each sleep for a second, once on a fixed pool of two hundred platform threads
and once on a virtual thread per task executor, and compare the total time. Then put the sleep inside a
`synchronized` block, run with the pinning trace enabled, and read the warning.
