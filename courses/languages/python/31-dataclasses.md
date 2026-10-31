---
title: Dataclasses
summary: Generated init, equality and repr from annotations, plus defaults, freezing, ordering and computed fields.
chapter: Objects
minutes: 13
status: draft
---

## The default case

```python
from dataclasses import dataclass


@dataclass
class Order:
    customer: str
    total: float
    currency: str = "USD"


order = Order("ada", 12.5)
print(order)
print(order == Order("ada", 12.5))
print(order == Order("ada", 12.5, currency="EUR"))
```

```text
Order(customer='ada', total=12.5, currency='USD')
True
False
```

`__init__`, `__repr__` and `__eq__` come from the field order and the annotations. Equality compares
every field, which is usually what you want and occasionally something to exclude.

## Defaults follow the argument rules

A field with a default cannot precede one without it. A mutable default needs a factory, because a
plain default would be created once at class definition and shared by every instance:

```python
from dataclasses import dataclass, field


@dataclass
class Cart:
    items: list[str] = field(default_factory=list)
    discount: float = 0.0
```

## Frozen makes instances immutable and hashable

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Point:
    x: int
    y: int


print(len({Point(0, 0), Point(0, 0)}))
```

```text
1
```

`frozen=True` blocks assignment after construction and generates `__hash__`, so instances work as dict
keys and set members. That combination is what a value object needs.

## `__post_init__` for validation and derived values

```python
from dataclasses import dataclass, field


@dataclass
class Span:
    start: int
    end: int
    length: int = field(init=False)

    def __post_init__(self) -> None:
        if self.end < self.start:
            raise ValueError("end must not precede start")
        self.length = self.end - self.start
```

`__post_init__` runs at the end of the generated initialiser, which is where a check or a computed
field belongs. `field(init=False)` keeps it out of the constructor, and `field(compare=False)` excludes
it from equality, which is the right treatment for a cache.

## Slots and ordering

```python
from dataclasses import dataclass


@dataclass(slots=True, order=True)
class Version:
    major: int
    minor: int


print(Version(1, 2) < Version(2, 0))
```

```text
True
```

`order=True` generates the comparisons from field order, and `slots=True` removes the instance dict.

## When a plain class is better

A dataclass describes data and a little behaviour around it. When a type has invariants across several
fields and a dozen methods, a hand written class documents the rules better, because the constructor
can be shaped to say what it requires.

## Check yourself

Write an order dataclass with a mutable field, make it frozen, and see what breaks. Then add a computed
field with `field(init=False)` and confirm it is absent from the constructor signature.
