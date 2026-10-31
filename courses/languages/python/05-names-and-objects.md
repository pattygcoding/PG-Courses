---
title: Names, objects and binding
summary: A name is attached to an object, and assignment never copies, which explains most of Python's surprises.
chapter: Language basics
minutes: 12
status: draft
---

## Assignment attaches a name to an object

```pycon
>>> a = [1, 2, 3]
>>> b = a
>>> b.append(4)
>>> a
[1, 2, 3, 4]
```

`a = [1, 2, 3]` creates a list and binds the name `a` to it. `b = a` binds a second name to that
same object, so the append is visible through both. No copy happened, and no name lives inside
another name.

## Identity, equality and type

```pycon
>>> a == b      # the same value?
True
>>> a is b      # the same object?
True
>>> id(a) == id(b)
True
```

`is` compares identity, `==` compares value, and `id` reports the address. Reach for `is` with
singletons such as `None`, `True` and `False`, and use `==` everywhere else.

## Rebinding and mutation are different operations

```python
def add_item(items: list[int], value: int) -> None:
    items.append(value)  # the caller sees this


def replace(items: list[int]) -> None:
    items = [99]  # the caller does not
```

`add_item` mutates the object both names point at. `replace` rebinds only its own local name, so
nothing outside changes. Arguments are bound to parameters by assignment, which is why questions
about Python being pass by value or pass by reference have a boring answer: it is neither, it is
binding.

## Check yourself

Predict the output before running it, then explain the difference:

```python
x = (1, 2)
y = x
y += (3,)
print(x)
```
