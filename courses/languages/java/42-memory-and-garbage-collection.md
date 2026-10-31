---
title: Memory and garbage collection
summary: Where objects live, how the collector reclaims them, and what a leak looks like in Java.
chapter: The JVM and performance
minutes: 14
status: draft
---

## The regions

| Region | Holds | Shared |
| --- | --- | --- |
| Heap | every object and array | yes, all threads |
| Stack | one frame per call, per thread | no |
| Metaspace | class metadata, outside the heap | yes |

```bash
java -Xms512m -Xmx1024m -XX:+HeapDumpOnOutOfMemoryError -jar tool.jar
```

Setting the initial and maximum heap to the same value stops the JVM resizing under load and makes the
process's memory use predictable, which matters in a container where a resize can mean the difference between
running and being killed. An `OutOfMemoryError` naming the heap means the live set did not fit; one naming
metaspace means classes kept being loaded, which is what a redeploy loop in an application server does.

## Allocation is fast and collection is the cost

A new object is allocated by bumping a pointer in a region called eden, which is about as fast as assigning a
local variable. The cost arrives when eden fills: the collector walks the live objects, copies them to a
survivor region, and reclaims the rest. Objects that survive a few collections are promoted to the old
generation, and collecting that takes longer.

The important consequence: most objects die young, and short lived garbage is nearly free. Long lived garbage
is what costs, which is where an unbounded cache ends up.

## The collectors

| Collector | Best at |
| --- | --- |
| G1 | the default since Java 9, a balance with a pause target |
| ZGC | large heaps with pauses under a millisecond |
| Shenandoah | the same idea, a different implementation |
| Parallel | throughput on a machine that can pause for a while |

```bash
java -XX:+UseZGC -Xmx16g -jar tool.jar
```

G1 aims at a pause target you can set with `-XX:MaxGCPauseMillis`, which is a request rather than a promise,
and it trades throughput for it. ZGC and Shenandoah do their work concurrently with the application and keep
pauses tiny, at the cost of some throughput and more memory. Pick one by measuring the pause times your
service actually needs: a batch job cares about throughput and not about a half second pause, and a latency
sensitive service cares about the opposite.

## Reading a log line

```text
[2.345s][info][gc] GC(12) Pause Young (Normal) (G1 Evacuation Pause) 156M->24M(1024M) 12.4ms
```

That line says a young collection took 12.4 milliseconds and reduced the heap from 156 MB to 24 MB. Repeating
lines with a rising heap after collection, where `24M` keeps growing, mean objects are being retained. A pause
time climbing toward the target means the live set is getting close to the heap size.

## A leak is a reference nobody dropped

Java has no memory leak in the C sense and it has leaks all the same: an object stays reachable from a GC root
so the collector may not reclaim it.

- A `static` collection that grows and is never cleared. This is the most common one.
- A `ThreadLocal` value in a pooled thread, which outlives the task that set it.
- A listener or a callback registered and never removed, which holds the object that registered it.
- A cache with no bound, which is the same problem with a nicer name.

```java
private static final Map<String, byte[]> CACHE = new HashMap<>();      // grows forever
```

A bounded cache is the fix:

```java
private static final Map<String, byte[]> CACHE =
        Collections.synchronizedMap(new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, byte[]> eldest) {
                return size() > 1000;
            }
        });
```

## Finding one

```bash
jcmd <pid> GC.heap_info
jcmd <pid> GC.class_histogram
```

The histogram lists the classes with the most live instances, which names the type that is accumulating. From
there a heap dump opened in a profiler shows the reference path from a GC root to one of those objects, which
is the answer to "what is holding this".

## Object size is worth knowing

An `Integer` is sixteen bytes for a value of four, because of a twelve byte header, four bytes of payload and
alignment to eight. A million of them is 16 MB rather than 4 MB, which is why a primitive stream or a primitive
array matters in a hot path.

Two things soften that: compressed ordinary object pointers keep references at four bytes on heaps below about
32 GB, and compact strings store a `String` as Latin-1 bytes when every character fits, so an ASCII string
takes half the space it used to.

The allocation profiler in the next pages reports bytes per allocation site, which is the measurement that
settles whether a particular boxed value is worth removing.

## Check yourself

Run a program with `-Xmx64m` that adds to a static list in a loop until it fails, and read the
`OutOfMemoryError`. Then bound the list and confirm the loop finishes. Run `jcmd GC.class_histogram` against a
running process and identify the class with the most instances.
