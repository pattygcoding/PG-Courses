---
title: Structural pattern matching
summary: match statements that describe the shape of data, and the cases where they beat an if chain.
chapter: Control flow
minutes: 14
status: draft
---

## match picks a shape, not a value

```python
def route(command: dict[str, object]) -> str:
    match command:
        case {"action": "get", "id": int(item_id)}:
            return f"fetching {item_id}"
        case {"action": "list"}:
            return "listing"
        case {"action": action}:
            return f"unknown action {action}"
        case _:
            raise ValueError("no action in command")
```

Each `case` describes a structure. The first one matches a dict with those keys, where the value
under `id` is an `int`, and binds it to `item_id`. Literals compare, names bind, and `_` matches
anything without binding.

## Sequences and classes

```python
def describe(point: object) -> str:
    match point:
        case (0, 0):
            return "origin"
        case (x, 0):
            return f"on the x axis at {x}"
        case (0, y):
            return f"on the y axis at {y}"
        case (x, y):
            return f"at {x}, {y}"
        case _:
            return "not a point"
```

A class matches on its attributes, which is how a dataclass gets taken apart:

```python
from dataclasses import dataclass


@dataclass
class Retry:
    attempts: int


@dataclass
class GiveUp:
    reason: str


def handle(outcome: Retry | GiveUp) -> str:
    match outcome:
        case Retry(attempts=n) if n < 3:
            return "try again"
        case Retry():
            return "stop retrying"
        case GiveUp(reason=reason):
            return f"gave up: {reason}"
```

The `if` after a pattern is a guard. It runs only once the pattern has matched, so the bound names
are already available.

## Where it earns its place

- Turning a message or a command into a small number of shapes.
- Walking a tree, such as an expression or a parsed document.
- Replacing a chain of `isinstance` checks where each class returns something different.

Where it does not: two branches on a boolean, or a list of value comparisons. A plain `if` or a
lookup dict says that in fewer words.

## Check yourself

Model a JSON value that is a string, a number or a list of numbers, and write a function that
summarises it with `match`. Then decide whether the `match` reads better than `if isinstance`.
