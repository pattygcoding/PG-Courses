---
title: Memory and object overhead
summary: What an object costs, why parallel lists can beat a list of tuples, and how to find what is holding memory.
chapter: Concurrency and performance
minutes: 13
status: draft
---

## Every object carries a header

```pycon
>>> import sys
>>> sys.getsizeof(1), sys.getsizeof(1.0)
(28, 24)
>>> sys.getsizeof([]), sys.getsizeof([1, 2, 3])
(56, 88)
```

An integer costs 28 bytes, a float 24, and an empty list 56 before it holds anything. Exact numbers vary
between builds and the shape holds everywhere: small objects cost more than the value inside them.

That is the argument for `__slots__` on a class with millions of instances, and for `array` or `numpy`
when the data is numeric. A list of ten million floats holds 80 MB of pointers plus roughly 240 MB of
float objects, where `array("d", ...)` holds the 80 MB and nothing else.

## Containers against parallel sequences

```python
rows = [(1, 2.5), (2, 3.5), (3, 4.5)]
ids = [1, 2, 3]
values = [2.5, 3.5, 4.5]
```

A list of tuples allocates one tuple per row. Two parallel lists allocate two lists and no per-row
container, and they iterate without unpacking. The cost is that the two have to stay in step, which is a
real risk worth writing down when you make the choice.

## Finding what holds the memory

```python
import tracemalloc

tracemalloc.start()
rows = [{"id": n} for n in range(100_000)]
snapshot = tracemalloc.take_snapshot()

for entry in snapshot.statistics("lineno")[:3]:
    print(entry)
```

```text
/script.py:5: size=11.4 MiB, count=100001, average=120 B
```

The snapshot names the file and the line that allocated the most, which is usually enough to find an
unbounded cache.

## Cycles and the collector

Reference counting frees an object as soon as its last reference goes, which covers most cases at once.
Two objects pointing at each other keep each other alive, so a cycle collector sweeps periodically for
groups that are unreachable.

```pycon
>>> import gc
>>> gc.collect()
0
```

The return value is the number of unreachable objects collected, and it is a quick check on whether a leak
is cycles or live references. An object in a cycle with a `__del__` method is no longer uncollectable,
though the order of cleanup is unpredictable, which is another reason to prefer a context manager.

## Leaks that are not leaks

A module level list that grows once per request, a cache with no bound, and a closure holding a reference
to something large are behind most reports of a leak in Python. All three are references that were never
dropped, and `tracemalloc` points at the line that created them.

## Check yourself

Measure a list of 100,000 small objects with and without `__slots__`. Then find the largest allocating
line in a program you have written and decide whether that memory is still needed.
