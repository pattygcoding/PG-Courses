---
title: Defining functions
summary: Signatures that document themselves, guards instead of nesting, and the parts of a docstring worth writing.
chapter: Functions
minutes: 12
status: draft
---

## A function is a named block with its own scope

```python
def mean(values: list[float]) -> float:
    if not values:
        raise ValueError("mean of an empty sequence is undefined")
    return sum(values) / len(values)
```

The parameters and the return annotation are the first documentation anyone reads. The annotation
costs nothing at run time and it lets a type checker and your editor help you.

## Guards instead of nesting

```python
def shipping(total: float, country: str, express: bool) -> float:
    if total <= 0:
        raise ValueError("total must be positive")

    base = 5.0 if country == "US" else 20.0
    return base * 2 if express else base
```

Each guard that fails leaves the function, so the working part of the body stays at one indentation
level. Wrapping the real work in the condition that succeeds adds a level for every check.

## Returning several values is returning a tuple

```pycon
>>> def stats(values):
...     return min(values), max(values)
...
>>> stats([3, 1, 2])
(1, 3)
>>> low, high = stats([3, 1, 2])
```

The comma builds a tuple, and the caller unpacks it. There is no second return channel, so a
function either raises on failure or encodes the failure in what it returns. Choose one and say which
in the docstring.

## Docstrings describe the contract

```python
def mean(values: list[float]) -> float:
    """Return the arithmetic mean of values.

    Raises ValueError when values is empty, because the mean of no numbers
    is undefined rather than zero.
    """
    if not values:
        raise ValueError("mean of an empty sequence is undefined")
    return sum(values) / len(values)
```

Say what it does, what it needs and what it raises. Leave out what the signature already states, and
leave out anything that will go stale when the body changes.

## Check yourself

Write a function with three validation guards and no nesting past one level. Then write the same
function as a single `if` wrapping the body, and compare how the two read.
