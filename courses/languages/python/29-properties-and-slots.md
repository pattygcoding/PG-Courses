---
title: Properties, slots and attribute control
summary: Computed attributes, validation on assignment, and the memory that slots save.
chapter: Objects
minutes: 12
status: draft
---

## A property reads like an attribute and runs code

```python
import math


class Circle:
    def __init__(self, radius: float) -> None:
        self._radius = radius

    @property
    def radius(self) -> float:
        return self._radius

    @radius.setter
    def radius(self, value: float) -> None:
        if value <= 0:
            raise ValueError("radius must be positive")
        self._radius = value

    @property
    def area(self) -> float:
        return math.pi * self._radius**2


circle = Circle(2)
circle.radius = 3
print(f"{circle.area:.2f}")
```

```text
28.27
```

`circle.radius = 3` runs the setter, so the check cannot be skipped by assigning to the public name.
The single underscore on `_radius` marks it as internal by convention, and the property is what the
rest of the program uses.

## Not every attribute needs a property

A property that only returns a field adds a layer with no rule in it, and it changes how `vars()`,
serialisation and `dataclasses.asdict` behave. Add one when there is a computation or a check to
perform, as in the setter above.

## slots removes the instance dictionary

```python
import sys


class Point:
    __slots__ = ("x", "y")

    def __init__(self, x: float, y: float) -> None:
        self.x = x
        self.y = y


point = Point(1, 2)
print(hasattr(point, "__dict__"))
print(sys.getsizeof(point))
```

```text
False
48
```

The byte count depends on the build and the field count, and the fact that matters is that no dict is
allocated per instance. A second effect is that attributes cannot be invented:

```pycon
>>> point.z = 3
Traceback (most recent call last):
AttributeError: 'Point' object has no attribute 'z'
```

That restriction is the reason to use `__slots__` in a program holding a million records, and the
reason to avoid it in a class you expect to extend. `@dataclass(slots=True)` generates the same thing
for a dataclass.

## Check yourself

Add a `diameter` property with no setter, assign to it, and record the error. Then build a list of one
million objects with and without `__slots__` and compare the memory reported by `tracemalloc`.
