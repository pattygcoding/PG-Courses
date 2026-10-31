---
title: Concurrent collections and atomics
summary: Containers that are safe to share, counters without a lock, and the operations that need one anyway.
chapter: Concurrency
minutes: 13
status: draft
---

## Wrap a collection and every read takes a lock

```java
List<Row> safe = Collections.synchronizedList(new ArrayList<>());

for (Row row : safe) {              // ConcurrentModificationException
    process(row);
}
```

The wrapper synchronises each call, so a single `add` is safe, and an iteration is not, because the loop
makes many calls. Iterating needs a manual block on the list, and every other thread is blocked meanwhile.
That is why the concurrent collections exist.

## Concurrent containers

```java
Map<String, Long> counts = new ConcurrentHashMap<>();

counts.merge(row.key(), row.value(), Long::sum);
```

| Container | Note |
| --- | --- |
| `ConcurrentHashMap` | lock striping per bin, no lock for a read |
| `CopyOnWriteArrayList` | a copy per write, reads are free, for a rare write and many reads |
| `ConcurrentLinkedQueue` | a lock free queue |
| `ArrayBlockingQueue` | a bounded queue with producers that wait |
| `LinkedBlockingQueue` | optionally bounded, the usual work queue |

`ConcurrentHashMap` does not allow null keys or values, which is the trade for not needing a lock to check.
The compound methods are the point:

```java
counts.computeIfAbsent(row.key(), key -> new AtomicLong()).incrementAndGet();
counts.computeIfPresent(row.key(), (key, value) -> value + 1);
```

Each of those runs the mapping under a lock on that bin, so the check and the write are one atomic step. A
`containsKey` followed by a `put` is not, and two threads can both see the missing key.

Iterating a `ConcurrentHashMap` is safe and weakly consistent, so it may or may not reflect a change made
during the loop and never throws. That is a different contract from the fail-fast collections and worth
knowing before relying on either.

## Atomics for a single value

```java
private final AtomicLong total = new AtomicLong();

public void add(long value) {
    total.addAndGet(value);
}

public long total() {
    return total.get();
}
```

The atomic classes use a compare and swap instruction, so a counter or a reference swap needs no lock at all.
They are the right tool for one value and the wrong tool for two values that must change together, which is
what a `synchronized` block or a lock object is for.

```java
AtomicBoolean started = new AtomicBoolean();

if (started.compareAndSet(false, true)) {
    // exactly one thread runs this
}
```

`compareAndSet` succeeds only if the current value matches what you expected, which is what makes an
initialisation idempotent under concurrency.

```java
AtomicReference<Config> config = new AtomicReference<>(Config.defaults());

public void reload(Config next) {
    config.set(next);
}

public Config current() {
    return config.get();
}
```

An `AtomicReference` holding an immutable object is how a configuration or a routing table is replaced while
readers keep working on the old one. Every reader sees either the old value or the new one, and never a
half-built one, because the object is immutable.

## Bounded work queues

```java
BlockingQueue<Job> queue = new ArrayBlockingQueue<>(100);

Thread producer = Thread.ofPlatform().start(() -> {
    try {
        queue.put(new Job());
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});
```

A `BlockingQueue` makes the producer wait when the queue is full and the consumer wait when it is empty, which
is the backpressure that stops a fast producer from growing the queue until the heap runs out. An unbounded
queue has no such limit, which is why a service that queues requests should bound it and decide what to do
when it is full.

## LongAdder beats AtomicLong under contention

```java
private final LongAdder requests = new LongAdder();

public void record() {
    requests.increment();
}

public long total() {
    return requests.sum();
}
```

`LongAdder` spreads the count across several cells and sums them on read, so hundreds of threads incrementing
a metric do not fight over one cache line. `sum` is not atomic with respect to concurrent increments, which is
fine for a metric and wrong for a lock.

## Check yourself

Replace a `HashMap` guarded by `synchronized` with a `ConcurrentHashMap` and use `merge` to accumulate, then
compare the code. Write an `AtomicBoolean` guard that lets exactly one thread run an initialisation, and call
it from ten threads to confirm only one does.
