---
title: Context managers
summary: The with statement, what enter and exit do, and how to write one with contextlib.
chapter: Errors and resources
minutes: 13
status: draft
---

## with guarantees the cleanup

```python
with open("report.txt", "w", encoding="utf-8") as handle:
    handle.write("rows: 3\n")
```

The file is closed when the block ends, whether it ended normally, through a `return`, or through an
exception. The same shape covers locks, transactions, temporary directories and anything else that
must be released. Leaving the file open until garbage collection is the bug this prevents.

## Writing one with contextmanager

```python
import time
from collections.abc import Iterator
from contextlib import contextmanager


@contextmanager
def timed(label: str) -> Iterator[None]:
    started = time.perf_counter()
    try:
        yield
    finally:
        print(f"{label}: {time.perf_counter() - started:.3f}s")


with timed("load"):
    total = sum(range(1_000_000))
```

Everything before `yield` is setup and everything after is teardown. The `try`/`finally` is what makes
the teardown run when the body raises, which a plain function call cannot do.

## Yielding a value

```python
from collections.abc import Iterator
from contextlib import contextmanager


@contextmanager
def opened(path: str) -> Iterator[str]:
    handle = open(path, encoding="utf-8")
    try:
        yield handle.read()
    finally:
        handle.close()


with opened("report.txt") as text:
    print(len(text))
```

The value after `yield` becomes the name in the `as` clause. When there is nothing useful to hand
back, yield `None` and callers omit the `as`.

## Suppressing a specific error

```python
from contextlib import suppress
from pathlib import Path

with suppress(FileNotFoundError):
    Path("missing.txt").unlink()
```

A class based manager can suppress an exception by returning true from `__exit__`, and `suppress` is
the convenient version of that. Use it where absence is not a problem. Wrapping real work in it hides
failures exactly the way an empty `except` does.

## Two managers in one statement

```python
with open("in.txt", encoding="utf-8") as source, open("out.txt", "w", encoding="utf-8") as sink:
    sink.write(source.read())
```

Both are closed on the way out, in reverse order. Nesting the two `with` blocks would do the same and
add a level of indentation.

## Check yourself

Write a context manager that opens a SQLite connection, commits when the body finishes and rolls back
when it raises. Then run a statement that violates a unique constraint inside it and confirm the
rollback happened.
