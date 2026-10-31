---
title: Generics, protocols and annotations at scale
summary: Type variables that carry information, structural interfaces, and narrowing data that arrives untyped.
chapter: Advanced and the edges
minutes: 14
status: draft
---

## A type variable connects the argument to the return

```python
from collections.abc import Iterable
from typing import TypeVar

T = TypeVar("T")


def first(values: Iterable[T]) -> T:
    for value in values:
        return value
    raise ValueError("empty iterable")


reveal_type(first([1, 2, 3]))
reveal_type(first(["a"]))
```

A type checker reports `int` for the first call and `str` for the second, because the same `T` appears in
the argument and the return. Writing `Iterable[object]` instead would lose that, and every caller would end
up casting.

Bounding keeps the function able to do something useful with the value:

```python
from typing import TypeVar

Number = TypeVar("Number", bound=int | float)


def double(value: Number) -> Number:
    return value * 2
```

`bound` permits operations inside the function while still accepting subclasses. A constraint list, written
as `TypeVar("T", int, float)`, restricts the type to exactly those names and is the stricter and less
useful option.

## A protocol describes a shape, not a family

```python
from typing import Protocol


class Closable(Protocol):
    def close(self) -> None: ...


def shutdown(resource: Closable) -> None:
    resource.close()
```

```python
class Connection:
    def close(self) -> None:
        print("closed")


shutdown(Connection())
```

`Connection` never imported `Closable` and never inherited from it. It has the method, so it fits, and the
checker enforces the shape without the classes being related. That is what a duck typed library needs.

Adding `@runtime_checkable` allows `isinstance` against the protocol. The runtime check only looks at
whether the method names exist and does not compare signatures, so treat it as an early failure rather than
as validation.

## Narrowing what a boundary hands you

```python
def parse(raw: object) -> dict[str, str]:
    if not isinstance(raw, dict):
        raise TypeError("expected a mapping")
    return {str(key): str(value) for key, value in raw.items()}
```

`object` is what a file, a request or a command line produces. The way to use it is a check that narrows
the type, because everything you know about the value comes from that check. `cast` asserts a type and
verifies nothing, so it belongs where the evidence is real and the checker cannot see it.

## Settings worth turning on

```toml
[tool.mypy]
strict = true
warn_unreachable = true
```

`strict` covers the useful set of checks, and `warn_unreachable` reports a branch that a narrowed type made
impossible, which is usually a check left behind by a refactor. Run the checker in continuous integration so
the annotations cannot drift away from the code.

## Check yourself

Write a `first` function with a type variable and check the inferred types in your editor. Then define a
protocol for a storage backend, implement it in two classes with no inheritance between them, and confirm
both pass the checker.
