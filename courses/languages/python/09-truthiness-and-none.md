---
title: Truthiness, None and sentinel values
summary: What counts as false, why an empty list is not the same as a missing one, and how a sentinel keeps them apart.
chapter: Language basics
minutes: 11
status: draft
---

## The false values, all of them

```pycon
>>> bool(0), bool(0.0), bool(""), bool([]), bool({}), bool(set()), bool(None), bool(False)
(False, False, False, False, False, False, False, False)
```

Everything else is true, including `bool("0")`, `bool([0])` and `bool(-1)`. A class you write decides
for itself by defining `__bool__`, or `__len__` if it has no `__bool__`.

## Empty is not the same as missing

```python
def total(items: list[int] | None) -> int:
    if items is None:
        raise ValueError("items is required")
    return sum(items)
```

`if not items` would treat `None` and `[]` alike. When those mean different things, check `is None`
and leave emptiness to its own condition. Functions that accept an empty list where they meant to
require data are a common source of quiet zeroes in reports.

## None is a singleton

```pycon
>>> None == None, None is None
(True, True)
>>> value = None
>>> value is None
True
```

Compare with `is`, because `==` can be overloaded by the other operand and identity cannot.

## A sentinel separates "absent" from "None is a real value"

```python
MISSING = object()


def lookup(store: dict[str, str], key: str, default: str | None = MISSING) -> str | None:
    if key in store:
        return store[key]
    if default is MISSING:
        raise KeyError(key)
    return default
```

This is the trick `dict.get` uses. Without it, a stored `None` and a key that was never set look
identical, and a caller cannot tell which happened.

## Check yourself

Write a function that returns the mean of a list, raises on an empty list, and returns `None` when
the caller passes `None`. Cover all three cases in a test.
