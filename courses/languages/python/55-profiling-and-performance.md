---
title: Profiling and performance
summary: Measure before changing anything, find the real hotspot, and the handful of changes that usually matter.
chapter: Concurrency and performance
minutes: 14
status: draft
---

## Time a snippet with timeit

```python
import timeit

print(timeit.timeit("[x * 2 for x in range(1000)]", number=10_000))
```

```text
0.41231840000022264
```

`timeit` runs the snippet many times and reports the total, which removes most of the noise from a machine
that is doing other things. For start-up cost, `python -X importtime -c "import shop"` prints what each
import cost, which matters because that delay is paid by every command you run.

## Let the profiler find the hotspot

```bash
python -m cProfile -s cumulative script.py
```

```text
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
     2000    1.842    0.001    1.842    0.001 script.py:12(find_pairs)
```

`tottime` is time spent inside the function and `cumtime` includes everything it called. Sorting by
`cumtime` finds the entry point that owns the work, and sorting by `tottime` finds the function doing it.
For a process already running, `py-spy top --pid 1234` samples it without a restart.

Guessing at the hotspot is wrong often enough that running the profiler is worth it even when you are
sure.

## The changes that usually move the number

| Change                                             | Effect                              |
| -------------------------------------------------- | ----------------------------------- |
| Take work out of the innermost loop                | Usually the largest win by far      |
| Use a set or dict for membership instead of a list | Linear to constant                  |
| Build text with `join` rather than `+=`            | Avoids copying the string each time |
| Lift an attribute lookup out of a loop             | Small but consistent                |
| Move a numeric loop into a vectorised library      | Large for array arithmetic          |
| Batch queries instead of one per row               | Removes round trips                 |

The last one is the classic. A loop issuing one query per row is slow because of the round trips, and the
fix is a single query with an `IN` clause rather than a faster loop.

## What an optimisation costs

A cache or a special case makes the code harder to change, so it is worth adding when the measurement says
the path is hot. Keep the profiler output or a benchmark in the repository when you do, because a claim
about performance with no number attached is an opinion.

## Check yourself

Profile a function you have written, find the hottest line, change one thing and measure again. If the
number did not move, revert the change instead of keeping it.
