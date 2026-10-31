---
title: Modules, packages and __init__
summary: How a file becomes importable, what belongs in a package initialiser, and how to untangle a circular import.
chapter: Modules, tooling and packaging
minutes: 12
status: draft
---

## A module is a file, a package is a directory

```text
project/
  src/
    shop/
      __init__.py
      pricing.py
      inventory.py
```

```python
from shop.pricing import total
from shop import inventory

print(total([1, 2]))
print(inventory.available("widget"))
```

Any `.py` file is a module, and a directory holding an `__init__.py` is a package. The dotted path
follows the directories, `from shop.pricing import total` binds the object named `total` from the module
`shop.pricing`, and `from shop import inventory` binds the module itself.

## Keep `__init__` small

`__init__.py` runs once when the package is first imported. A docstring, the public names you want to
re-export and a version belong there. Connecting to a network or reading the environment does not,
because importing a package should not do work a caller cannot predict.

```python
"""Pricing and inventory helpers."""

from shop.pricing import total

__all__ = ["total"]
```

`__all__` lists what a star import exposes and doubles as documentation of the intended surface. Star
imports themselves are rare in application code, and the list is still worth keeping accurate.

## Absolute and relative imports

```python
from .pricing import total  # a sibling inside the same package
from shop.pricing import total  # absolute, from the project root
```

A relative import starts with a dot and works only inside a package. An absolute import spells out the
whole path, which is easier to grep for and what most style guides prefer. Running a file inside a
package with `python shop/pricing.py` breaks relative imports, which is one reason `python -m
shop.pricing` exists.

## Circular imports

Two modules importing each other at the top level raise `ImportError` naming whichever loaded second.
Three fixes, in the order worth trying:

1. Move the shared names into a third module both can import.
2. Import inside the function that needs the name.
3. Import only for the type checker.

```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from shop.orders import Order


def describe(order: "Order") -> str:
    return str(order)
```

`TYPE_CHECKING` is false at run time, so the import happens for the type checker and not for the
interpreter. The annotation is a string in that case, which is what keeps the name unresolved until
something checks it.

## Check yourself

Split a single file script into a package with three modules, where one imports from the other two. Run
it with `python -m` and then with a direct path, and compare the two outcomes.
