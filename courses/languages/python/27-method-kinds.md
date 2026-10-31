---
title: Instance, class and static methods
summary: What each method kind receives, and the few cases where a classmethod or staticmethod earns its place.
chapter: Objects
minutes: 11
status: draft
---

## Three kinds, three first arguments

```python
class Temperature:
    def __init__(self, celsius: float) -> None:
        self.celsius = celsius

    def as_fahrenheit(self) -> float:
        return self.celsius * 9 / 5 + 32

    @classmethod
    def from_fahrenheit(cls, fahrenheit: float) -> "Temperature":
        return cls((fahrenheit - 32) * 5 / 9)

    @staticmethod
    def is_freezing(celsius: float) -> bool:
        return celsius <= 0


print(Temperature.from_fahrenheit(212).as_fahrenheit())
print(Temperature.is_freezing(0))
```

```text
212.0
True
```

An instance method receives the instance, which is how alternative constructors and mutators get at
state. A classmethod receives the class, which is what makes it usable as a second constructor. A
staticmethod receives nothing, so it is a plain function that happens to live in the class body.

## classmethod keeps subclasses intact

```python
class Celsius(Temperature):
    pass


print(type(Celsius.from_fahrenheit(212)).__name__)
```

```text
Celsius
```

`cls` is the class the call came through, so a subclass receives a subclass. Hard coding
`Temperature(...)` in that method would quietly return the wrong type whenever it was called on a
subclass, and nothing would fail until a subclass specific method was missing.

## staticmethod is a namespace decision

```python
class Paths:
    @staticmethod
    def normalise(parts: list[str]) -> str:
        return "/".join(part.strip("/") for part in parts if part)
```

Use a staticmethod when the function belongs with the class as a concept but needs no instance and no
class state. When it needs neither and does not belong with the type, a module level function is the
simpler answer, because it can be imported and tested on its own.

## Check yourself

Add an alternative constructor to a subclass and confirm `cls` returns the subclass. Then move a
staticmethod that never touches the class out to module level and see whether the call sites read
better or worse.
