---
title: Threads, processes and the GIL
summary: Why threads help with waiting and processes help with computing, and how to tell which one you have.
chapter: Concurrency and performance
minutes: 14
status: draft
---

## What the global interpreter lock prevents

CPython runs one thread of bytecode at a time, so two threads each summing a large list do not finish in
half the time; they take turns. The lock exists because locking every object individually would be slower
for the single threaded case, which is most programs.

The lock is released around blocking input and output and inside many libraries written in C. Threads
therefore help when the work is waiting on a socket, a disk or a subprocess, because another thread runs
during that wait. They do not help for pure computation.

## Threads for waiting

```python
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


def read_length(path: Path) -> int:
    return len(path.read_text(encoding="utf-8"))


paths = [Path("a.txt"), Path("b.txt"), Path("c.txt")]

with ThreadPoolExecutor(max_workers=4) as pool:
    lengths = list(pool.map(read_length, paths))
```

Reading three files at once overlaps the waits, so the total lands closer to the slowest file than to the
sum. The same shape works for HTTP requests and for a database driver that releases the lock.

## Processes for computing

```python
from concurrent.futures import ProcessPoolExecutor


def count_divisors(limit: int) -> int:
    return sum(1 for n in range(1, limit) if limit % n == 0)


if __name__ == "__main__":
    with ProcessPoolExecutor() as pool:
        results = list(pool.map(count_divisors, [999_983, 999_979]))
```

Each worker is a separate interpreter with its own lock, so four processes can use four cores. The costs
are real: a process takes milliseconds to start, arguments and results are serialised across the
boundary, and shared state is not shared. The `if __name__ == "__main__"` guard is required on Windows
and macOS because the spawned child imports the module again.

## Choosing

| Work | Tool |
| --- | --- |
| Waiting on input and output | threads, or async |
| CPU bound, inside one process | processes |
| Thousands of sockets | async |
| A library that is not thread safe | one thread per connection, or async |

## Shared mutable state

Threads share memory, so two of them incrementing the same counter lose updates unless the read and the
write happen together:

```python
import threading

counter = 0
lock = threading.Lock()


def bump(times: int) -> None:
    global counter
    for _ in range(times):
        with lock:
            counter += 1
```

A lock per increment costs more than the increment. The better answer is usually to have each thread work
on its own data and combine the results at the end, which is what `pool.map` does for you.

## Check yourself

Run the same CPU bound function over four inputs with a thread pool and with a process pool, and time
both. Then repeat it with a function that sleeps and explain the difference between the two results.
