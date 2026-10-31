---
title: Classes and instances
summary: Attributes, initialisation, and the difference between state on the class and state on an instance.
chapter: Objects
minutes: 13
status: draft
---

## A class is a namespace with a recipe

```python
from dataclasses import dataclass


@dataclass
class Account:
    owner: str
    balance: float = 0.0

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("amount must be positive")
        self.balance += amount
```

`@dataclass` writes `__init__`, `__repr__` and `__eq__` from the annotations, which removes the
boilerplate you would otherwise read past. `self` is the instance the method was called on, and
assigning to an attribute on it is how an object keeps state.

## Class attributes are shared, instance attributes are not

```python
class Counter:
    total = 0

    def bump(self) -> None:
        self.total += 1


a, b = Counter(), Counter()
a.bump()
print(a.total, b.total, Counter.total)
```

```text
1 0 0
```

`self.total += 1` reads the class attribute, then writes an instance attribute, so `a` separates from
the class after the first call. A mutable class attribute behaves worse, because nothing separates:

```python
class Bad:
    items = []


first, second = Bad(), Bad()
first.items.append(1)
print(second.items)
```

```text
[1]
```

Anything mutable belongs in `__init__`, or behind a dataclass factory that runs per instance:

```python
from dataclasses import dataclass, field


@dataclass
class Cart:
    items: list[str] = field(default_factory=list)
```

`field(default_factory=list)` calls `list()` for each new instance, which is what a default argument
cannot do.

## Not every function needs a class

A function that takes its state as arguments is easier to test, easier to reorder and easier to call
from somewhere else. Reach for a class when the data and the operations travel together, and when
independent instances are the point.

## Check yourself

Write a class holding several accounts, then write the same behaviour as functions over a dict. Note
where the invalid-state checks ended up in each version.
