---
title: Descriptors
summary: The mechanism behind properties, methods and slots, and how to write one rule for many fields.
chapter: Advanced and the edges
minutes: 13
status: draft
---

## A class attribute with `__get__` controls lookup

When a class attribute defines `__get__`, reading that name on an instance goes through it. That is how
`property` works, how a function becomes a bound method, and how `__slots__` stores its values. There is
no separate mechanism: every one of those is a descriptor.

```python
class Positive:
    def __set_name__(self, owner: type, name: str) -> None:
        self.name = name

    def __get__(self, instance: object, owner: type | None = None) -> float:
        if instance is None:
            return self
        return instance.__dict__[self.name]

    def __set__(self, instance: object, value: float) -> None:
        if value <= 0:
            raise ValueError(f"{self.name} must be positive")
        instance.__dict__[self.name] = value


class Order:
    quantity = Positive()
    price = Positive()
```

```pycon
>>> order = Order()
>>> order.quantity = 3
>>> order.quantity
3
>>> order.price = -1
Traceback (most recent call last):
ValueError: price must be positive
```

`__set_name__` runs once when the class is created and receives the attribute name, which is how the
descriptor can name itself in an error message. The value lives in the instance dictionary, so two orders
do not share one.

## Why this is worth knowing

A property needs a getter and a setter per field. A descriptor is written once and applied to as many
fields as you like, and every one of them gets the rule and the correct name in the message. That is the
same reason a framework can validate a model field from one line of configuration.

## Data and non data descriptors

A descriptor with `__get__` and `__set__` is a data descriptor and takes priority over the instance
dictionary. One with `__get__` alone is a non data descriptor, and the instance dictionary wins. That is
why a method can be shadowed by an instance attribute of the same name while a property cannot, and it is
the rule behind an attribute that behaves differently after assignment.

## Most code should not write one

Reach for `property`, `@dataclass` or a plain attribute first, because a descriptor is a small amount of
indirection that a reader has to hold in their head. Writing one is worth it when the same access rule
repeats across many fields.

## Check yourself

Write a descriptor that rounds a value to two decimal places and apply it to two fields. Then write the
same rule with two properties and compare the line counts and the error messages.
