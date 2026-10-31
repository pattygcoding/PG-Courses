---
title: while loops, retries and loop else
summary: Loops that run until something changes, and the else clause that reports an unfinished search.
chapter: Control flow
minutes: 11
status: draft
---

## while is for an unknown number of passes

```python
import time
from collections.abc import Callable


def wait_for(check: Callable[[], bool], timeout: float = 30.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if check():
            return
        time.sleep(0.1)
    raise TimeoutError("condition was not met in time")
```

A `for` loop walks a sequence of known length. A `while` loop handles the cases where the number of
attempts depends on the world: retrying, polling, draining a queue. `time.monotonic()` is the clock
to use for timeouts, because it cannot jump backwards when the system clock is adjusted.

## Read until the input runs out

```python
def read_all(stream) -> list[str]:
    lines: list[str] = []
    while (line := stream.readline()) != "":
        lines.append(line.rstrip("\n"))
    return lines
```

The walrus keeps the read and the test together, which is the shape a read loop wants.

## else runs when the loop was not interrupted

```python
def find_user(users: list[dict[str, str]], name: str) -> dict[str, str] | None:
    for user in users:
        if user["name"] == name:
            found = user
            break
    else:
        return None
    return found
```

The `else` belongs to the loop and runs only when no `break` happened. When the body can return
directly, the early return is clearer and needs no extra name:

```python
def find_user(users: list[dict[str, str]], name: str) -> dict[str, str] | None:
    for user in users:
        if user["name"] == name:
            return user
    return None
```

Reach for loop `else` when you cannot return from inside the body, for example when the search
builds a value across several matches.

## Every while True needs a visible exit

```python
while True:
    command = input("> ")
    if command in {"quit", "exit"}:
        break
    print(command)
```

Keep the exit within a screen of the loop, so a reader sees the loop can end.

## Check yourself

Write a retry helper that calls a function up to five times, waits between attempts and raises the
last error. Then write the same helper with a `for` loop and say which version you would keep.
