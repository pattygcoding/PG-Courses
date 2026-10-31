---
title: Generators
summary: yield turns a function into a lazy sequence, and the pipeline pattern that keeps memory flat.
chapter: Iteration and the standard library
minutes: 14
status: draft
---

## yield pauses the function

```python
import csv
from collections.abc import Iterator
from pathlib import Path


def read_rows(path: Path) -> Iterator[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            yield row


for row in read_rows(Path("rows.csv")):
    print(row["name"])
```

Calling `read_rows` returns a generator and runs none of the body. Each `next` runs to the following
`yield` and suspends with the local names intact. When the caller stops, the generator is closed and
the `with` block exits, so the file handle is released even if the loop ended early.

That combination is the reason to prefer a generator to a function returning a list: a million rows cost
one row of memory, and the cleanup happens at the right moment.

## Stages that pull

```python
def lines(path: str):
    with open(path, encoding="utf-8") as handle:
        yield from handle


def kept(source):
    for line in source:
        if line.strip():
            yield line.strip()


def parsed(source):
    for line in source:
        key, _, value = line.partition("=")
        yield key, value


for key, value in parsed(kept(lines("config.ini"))):
    print(key, value)
```

Each stage pulls one item when the next stage asks for it, so the file is never held in memory and no
stage knows how the previous one is built. `yield from` forwards to another iterable and passes
values, `send` and exceptions through, which is what makes the stages composable.

## send, throw and close

```python
def running_total():
    total = 0
    while True:
        value = yield total
        if value is not None:
            total += value


accumulator = running_total()
next(accumulator)
print(accumulator.send(10))
print(accumulator.send(5))
```

```text
10
15
```

`send` resumes the generator and becomes the value of the `yield` expression. The first `next` is
needed to reach the first `yield`, which is why a generator that receives values must be primed.
`throw` raises inside the generator at the suspension point and `close` raises `GeneratorExit`, so a
`finally` block still runs. Most code never needs `send`; the two way form belongs in a coroutine or a
state machine.

## A return ends the iteration

```python
def first_long(lines):
    for line in lines:
        if len(line) > 10:
            return line
    return None
```

A `return` inside a generator stops it, and its value travels with `StopIteration` instead of being
yielded. For a search that stops at the first hit, a plain function returning a value is clearer than a
generator.

## Check yourself

Write three generator stages that filter, transform and count, and join them in one expression.
Confirm with `tracemalloc` that memory stays flat while the input file grows.
