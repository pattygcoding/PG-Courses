---
title: Thread safety and shared state
summary: What a data race is, how synchronized and volatile fix it, and the happens-before rule behind both.
chapter: Concurrency
minutes: 14
status: draft
---

## Two threads, one counter

```java
public class Counter {
    private int value;

    public void increment() {
        value++;                    // read, add, write
    }
}
```

`value++` is three steps, and two threads can interleave between them, so a thousand increments from two
threads can end at 1999 or worse. Nothing in the program reports it. That is a data race: two threads touch
the same memory with at least one writing, and no synchronisation orders the accesses.

The fix is to make the shared state either not shared, or protected by a rule every thread follows.

## Don't share it

```java
long total = rows.parallelStream()
        .mapToLong(Row::value)
        .sum();
```

The safest concurrent code shares nothing, which is what a reduction does: each thread accumulates its own
partial result and the framework combines them. An immutable object can be shared with no rule at all, which
is the other half of the argument for immutable types.

## synchronized makes it a critical section

```java
public class Counter {
    private int value;

    public synchronized void increment() {
        value++;
    }

    public synchronized int value() {
        return value;
    }
}
```

A `synchronized` method or block takes the monitor of an object, so only one thread runs inside at a time,
and the next thread to enter sees everything the previous one wrote. That second property is the one people
forget: the lock does not only stop overlap, it also publishes the changes.

```java
public void increment() {
    synchronized (this) {
        value++;
    }
}
```

A block around the smallest region is the version to prefer, since a long critical section serialises
everything that touches it. Never synchronise on a publicly reachable object, because anything else can take
the same lock and deadlock with you. A private final field as the lock object is the safe choice.

## volatile publishes, it does not protect

```java
private volatile boolean running = true;

public void stop() {
    running = false;
}

public void loop() {
    while (running) {
        work();
    }
}
```

`volatile` guarantees that a read sees the last write rather than a cached copy, and it is exactly right for a
flag. It does not make `value++` safe, because that is three operations and `volatile` orders them
individually rather than as a unit.

The failure `volatile` fixes is worth knowing: without it, a loop reading a flag may keep reading a cached
value forever, because nothing told the CPU the other core changed it.

## happens-before is the rule underneath

Two operations are ordered when the language says one happens before the other. The cases that matter:

- Writes in one thread are ordered by program order among themselves.
- Unlocking a monitor happens before the next lock of the same monitor.
- A write to a `volatile` field happens before a later read of that field.
- What a thread did before `start()` is visible to the new thread, and what a thread did before finishing is
  visible after `join()` returns.

Everything else may be reordered. That is why a value written before a `volatile` flag is set is safe to read
after the flag is seen, and why the same value written without an ordering guarantee is not.

## Deadlock comes from the lock order

```java
void transfer(Account from, Account to, long amount) {
    synchronized (from) {
        synchronized (to) {          // deadlocks if another thread goes the other way
            from.debit(amount);
            to.credit(amount);
        }
    }
}
```

Two threads taking the same pair of locks in opposite orders each hold one and wait for the other forever.
The fixes are to order the locks by something stable such as an identifier, to take both at once with
`tryLock` on a `ReentrantLock`, or to hold one lock over both objects.

`ReentrantLock` adds `tryLock` with a timeout and interruptible locking, which turns a deadlock into a
timeout:

```java
Lock lock = new ReentrantLock();

if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
    try {
        update();
    } finally {
        lock.unlock();
    }
}
```

## Check yourself

Run a thousand increments from two threads on an unprotected counter and print the total, then fix it with
`synchronized` and confirm. Add a `volatile boolean` flag that stops a worker loop, and explain why the same
keyword would not have fixed the counter.
