---
title: Metaclasses and class creation
summary: What a class statement runs, and the smaller tool that solves most of the same problems.
chapter: Advanced and the edges
minutes: 13
status: draft
---

## A class statement is an assignment

```python
class Shop:
    def price(self) -> int:
        return 10


Shop = type("Shop", (), {"price": lambda self: 10})
```

The second line is what the first one compiles to: a call to `type` with the name, the bases and the
namespace. At run time `type(Shop) is type` is true, and a metaclass is nothing more than a subclass of
`type` that intercepts that call.

## Intercepting class creation

```python
from typing import Any


class Registered(type):
    registry: dict[str, type] = {}

    def __new__(
        mcls,
        name: str,
        bases: tuple[type, ...],
        namespace: dict[str, Any],
        **kwargs: Any,
    ) -> "Registered":
        cls = super().__new__(mcls, name, bases, namespace, **kwargs)
        if bases:
            mcls.registry[name.lower()] = cls
        return cls


class Handler(metaclass=Registered):
    pass


class EmailHandler(Handler):
    pass
```

```pycon
>>> sorted(Registered.registry)
['emailhandler']
```

Every subclass registers itself as it is defined, which is how a plugin system finds its implementations
without a list somebody has to remember to update.

## `__init_subclass__` does the same job

```python
from typing import Any


class Handler:
    registry: dict[str, type] = {}

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        Handler.registry[cls.__name__.lower()] = cls
```

`__init_subclass__` runs for each subclass of the class that defines it, receives the subclass as `cls`,
and needs no metaclass. Reaching for it first avoids a whole category of problems, including the one where
two metaclasses in the same bases cannot be combined.

## Which tool covers which need

| Need                                 | Tool                            |
| ------------------------------------ | ------------------------------- |
| Run code when a subclass is defined  | `__init_subclass__`             |
| Add methods or fields after the fact | `@dataclass`, a decorator       |
| Validate at construction             | `__post_init__`                 |
| Register implementations             | `__init_subclass__` with a dict |
| Change how a class is built at all   | a metaclass                     |

The legitimate use for a metaclass is a shared base class that several unrelated classes inherit from and
that all of them need treated the same way, usually adding methods that read the namespace.

## Check yourself

Register three handler classes with `__init_subclass__` and look them up by name. Then do the same with a
metaclass and write down what the metaclass version cost you.
