---
title: functools and type hints on functions
summary: Caching, partial application and dispatch from the standard library, plus overloads that describe what a caller sees.
chapter: Functions
minutes: 14
status: draft
---

## Caching with one line

```python
from functools import cache


@cache
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)


print(fib(50))
print(fib.cache_info())
```

```text
12586269025
CacheInfo(hits=48, misses=51, maxsize=None, currsize=51)
```

Without the cache this call would take minutes; with it, the interpreter computes each value once.
`cache_info` reports hits and misses, which is the cheapest way to find out whether the cache is
paying for itself. `functools.lru_cache(maxsize=...)` does the same with a bounded size.

The arguments must be hashable, so a list cannot be a cached parameter. Caching also holds every
result in memory, which is a leak when the argument space is unbounded.

## partial binds the arguments you already know

```python
from functools import partial


def send(channel: str, message: str, *, urgent: bool = False) -> str:
    return f"[{channel}]{'!' if urgent else ''} {message}"


alert = partial(send, "alerts", urgent=True)
print(alert("disk full"))
print(alert("disk full", urgent=False))
```

```text
[alerts]! disk full
[alerts] disk full
```

Later arguments still win, so a bound keyword can be overridden at the call. This is how you hand a
callback to code that calls it with fewer arguments than your function needs.

## singledispatch picks a function by type

```python
from functools import singledispatch


@singledispatch
def render(value: object) -> str:
    return repr(value)


@render.register
def _(value: int) -> str:
    return f"{value:,}"


@render.register
def _(value: list) -> str:
    return ", ".join(render(item) for item in value)


print(render(1234567))
print(render([1, 2]))
print(render(None))
```

```text
1,234,567
1, 2
None
```

Dispatch uses the type of the first argument and falls back to the generic version. Another module can
register its own type, which is how a library lets you extend it without editing it.

## Overloads describe the call sites

```python
from typing import overload


@overload
def parse(value: str) -> list[str]: ...


@overload
def parse(value: bytes) -> bytes: ...


def parse(value: str | bytes) -> list[str] | bytes:
    if isinstance(value, bytes):
        return value
    return value.split(",")
```

Only the final definition runs. The `@overload` stubs exist for the type checker and whoever reads
the file, and they are worth keeping accurate because nothing verifies them.

Type hints are not enforced at run time, so data from a file, a request or a user still needs an
explicit check at the boundary.

## Check yourself

Decorate a recursive function with `@cache` and time it with and without. Then add a `render` case for
a type of your own and confirm dispatch reaches it.
