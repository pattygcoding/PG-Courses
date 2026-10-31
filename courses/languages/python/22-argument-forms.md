---
title: Argument forms and defaults
summary: Positional, keyword-only and variadic parameters, plus the mutable default that catches everyone once.
chapter: Functions
minutes: 13
status: draft
---

## Passing arguments three ways

```python
def connect(host: str, port: int = 5432, *, timeout: float = 5.0, retries: int = 3) -> str:
    return f"{host}:{port} timeout={timeout} retries={retries}"


connect("db")
connect("db", 6543)
connect("db", timeout=1.5)
connect("db", 6543, timeout=1.5, retries=0)
```

Everything before the `*` can be passed by position or by name. Everything after it must be passed by
name. A bare `*` is the cheapest readability win in the language, and it removes the bug where two
arguments of the same type get swapped at the call site.

## Defaults are evaluated once, when the function is defined

```python
def add_item(item: str, items: list[str] = []) -> list[str]:
    items.append(item)
    return items


print(add_item("a"))
print(add_item("b"))
```

```text
['a']
['a', 'b']
```

The list was created at definition, so every call that omits it shares the same object. The fix is a
`None` default, which is a sentinel no caller can pass by accident:

```python
def add_item(item: str, items: list[str] | None = None) -> list[str]:
    if items is None:
        items = []
    items.append(item)
    return items
```

## Collecting whatever arrives

```python
def report(*rows: str, **extra: object) -> str:
    parts = list(rows)
    for key, value in extra.items():
        parts.append(f"{key}={value}")
    return ", ".join(parts)


print(report("a", "b", limit=10))
print(report(*["a", "b"], **{"limit": 10}))
```

```text
a, b, limit=10
a, b, limit=10
```

`*` collects extra positional arguments into a tuple and `**` collects extra keyword arguments into a
dict. The same syntax unpacks a sequence or a mapping at a call site, which is how the second line
above is written.

Use variadic parameters for wrappers and forwarders. A named parameter documents intent, and
`**kwargs` forwarded through three layers loses it.

## The order in a signature

```text
positional, positional with a default, *args, keyword-only, **kwargs
```

Any other order is a syntax error. Put what a caller must supply first and the options after, so the
common call is the short one.

## Check yourself

Write a `format_row` function taking two required positional values, an optional separator and a
keyword-only width, and call it three ways. Then add a mutable default on purpose, predict the
output, and run it.
