---
title: Inheritance and the method resolution order
summary: How super() finds the next implementation, and why composition is often the cheaper choice.
chapter: Objects
minutes: 14
status: draft
---

## A subclass extends behaviour

```python
import math


class Shape:
    def area(self) -> float:
        raise NotImplementedError

    def describe(self) -> str:
        return f"{type(self).__name__} with area {self.area():.2f}"


class Circle(Shape):
    def __init__(self, radius: float) -> None:
        self.radius = radius

    def area(self) -> float:
        return math.pi * self.radius**2
```

`describe` is written once and calls `self.area()`, so the subclass supplies only the part that
differs. `type(self).__name__` reports the subclass, which is what a logging line wants.

## super() walks the resolution order

```python
class Base:
    def speak(self) -> str:
        return "base"


class Left(Base):
    def speak(self) -> str:
        return "left " + super().speak()


class Right(Base):
    def speak(self) -> str:
        return "right " + super().speak()


class Both(Left, Right):
    pass


print(Both().speak())
print([cls.__name__ for cls in Both.__mro__])
```

```text
left right base
['Both', 'Left', 'Right', 'Base', 'object']
```

`super()` means the next class in the resolution order of the instance, not the parent as written. In
`Both`, `Left.speak` calls `Right.speak`, which calls `Base.speak`. That chaining is why cooperative
classes call `super().__init__(...)` even when they believe they are the first to run.

## Abstract base classes state the contract

```python
from abc import ABC, abstractmethod


class Repository(ABC):
    @abstractmethod
    def get(self, key: str) -> str: ...


class MemoryRepository(Repository):
    def __init__(self) -> None:
        self.rows: dict[str, str] = {}

    def get(self, key: str) -> str:
        return self.rows[key]
```

Instantiating a subclass that forgot `get` raises `TypeError` at construction, which moves the
mistake from a production request to the moment the process starts.

## Delegation is often the smaller tool

Inheritance binds a subclass to every implementation detail of the base, including ones added later
by someone who has never seen the subclass. When you only want a behaviour wrapped around another
object, hold the object and forward the call:

```python
class Cached(Repository):
    def __init__(self, inner: Repository) -> None:
        self.inner = inner
        self.seen: dict[str, str] = {}

    def get(self, key: str) -> str:
        if key not in self.seen:
            self.seen[key] = self.inner.get(key)
        return self.seen[key]
```

That works with any implementation of the interface, including a test double.

## Check yourself

Build a three class hierarchy where every class calls `super()`, then print `__mro__` and trace the
call order on paper before running it. Compare your trace with the output.
