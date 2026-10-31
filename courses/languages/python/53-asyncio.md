---
title: Async and await with asyncio
summary: What the event loop does, where the concurrency comes from, and the blocking call that undoes all of it.
chapter: Concurrency and performance
minutes: 15
status: draft
---

## One thread with many operations in flight

```python
import asyncio


async def fetch(name: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return name


async def main() -> None:
    results = await asyncio.gather(
        fetch("a", 0.3),
        fetch("b", 0.1),
        fetch("c", 0.2),
    )
    print(results)


asyncio.run(main())
```

```text
['a', 'b', 'c']
```

The three sleeps overlap, so the whole thing takes about 0.3 seconds rather than 0.6. `gather` returns
results in the order they were passed, whatever order they finished in. The loop is single threaded: one
coroutine runs at a time and gives up control at each `await`.

That is the entire model, and it is why async helps when the work is waiting on something external rather
than computing.

## A blocking call stops everything

```python
import time


async def bad() -> None:
    time.sleep(1)
```

`time.sleep` never yields, so no other coroutine runs while it is inside. Every synchronous call behaves
this way, including `requests.get`, a large `read()` and a database driver written for threads. The
options are the async equivalent, a thread for work with no async version, or a client built for the
loop:

```python
import asyncio


async def read_blocking(path: str) -> str:
    return await asyncio.to_thread(open(path, encoding="utf-8").read)
```

## Timeouts and task groups

```python
import asyncio


async def main() -> None:
    async with asyncio.timeout(2.0):
        await fetch("a", 5.0)
```

```text
TimeoutError
```

`asyncio.timeout` cancels the enclosed work when the deadline passes, which is the only way a slow
dependency stops holding a request open. When several tasks should fail together, use a task group:

```python
async def main() -> None:
    async with asyncio.TaskGroup() as group:
        group.create_task(fetch("a", 0.1))
        group.create_task(fetch("b", 0.2))
```

The group waits for all of them and raises an exception group if any failed, which is clearer than
collecting tasks into a list and awaiting them one at a time.

## Where it helps

Async suits many operations that wait on input and output: HTTP calls, queries, sockets, timers. It does
nothing for work that is busy computing, because one thread still has to run the arithmetic. For that,
use processes.

## Check yourself

Write three coroutines that sleep for different lengths, run them with `gather` and time the total. Then
replace one sleep with `time.sleep` and observe both the runtime and the order of the results.
