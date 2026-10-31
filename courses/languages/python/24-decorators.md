---
title: Decorators
summary: Functions that wrap functions, written so the wrapper keeps the original name and signature.
chapter: Functions
minutes: 14
status: draft
---

## A decorator takes a function and returns one

```python
import time
from collections.abc import Callable
from functools import wraps
from typing import TypeVar

T = TypeVar("T")


def timed(func: Callable[..., T]) -> Callable[..., T]:
    @wraps(func)
    def wrapper(*args: object, **kwargs: object) -> T:
        started = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            print(f"{func.__name__} took {time.perf_counter() - started:.3f}s")

    return wrapper


@timed
def total(limit: int) -> int:
    return sum(range(limit))
```

`@timed` is exactly `total = timed(total)`. The wrapper calls the original and passes its result back,
so call sites are unchanged.

## functools.wraps is not decoration for its own sake

Without `@wraps(func)` the wrapped function reports the wrapper's name, loses the original docstring
and hides the annotations. Anything that inspects signatures, including most test frameworks, gets
the wrong answer.

## A parameterised decorator needs one more layer

```python
def retry(attempts: int = 3):
    def decorate(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: object, **kwargs: object) -> T:
            for attempt in range(1, attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if attempt == attempts:
                        raise

            raise AssertionError("unreachable")

        return wrapper

    return decorate
```

The outer function receives the argument, the middle one receives the function, and the inner one
receives the call. Three levels is the normal shape.

## Retrying everything is a choice worth revisiting

`except Exception` above also retries the bugs that will fail identically three times, which turns a
clear error into a slow one. Catch the errors that are worth retrying, usually the ones a network
produces, and let programming mistakes surface immediately.

## Order matters when decorators stack

```python
@timed
@retry(attempts=2)
def fetch(url: str) -> str:
    return url
```

Decorators apply bottom up, so `retry` wraps `fetch` first and `timed` wraps the retrying version.
The timer therefore reports the whole retry sequence rather than one attempt.

## Check yourself

Write a decorator that logs arguments and return values while keeping the original name and
docstring. Then print `inspect.signature` on the decorated function and confirm it still matches the
original.
