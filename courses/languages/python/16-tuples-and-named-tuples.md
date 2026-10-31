---
title: Tuples and named tuples
summary: Immutable sequences for fixed records, and the named fields that keep unpacking readable.
chapter: Collections
minutes: 11
status: draft
---

## Tuples are fixed length and immutable

```pycon
>>> point = (3, 4)
>>> point[0]
3
>>> point[0] = 5
Traceback (most recent call last):
TypeError: 'tuple' object does not support item assignment
```

Use a tuple when the number of elements is part of the meaning, such as a coordinate, a row or a
key. The immutability is the point: a tuple that reaches another function cannot be reshaped there.

A one element tuple needs the comma, because `(x)` is just a parenthesised expression:

```pycon
>>> type((1)), type((1,))
(<class 'int'>, <class 'tuple'>)
```

## Unpacking

```python
def divide(a: int, b: int) -> tuple[int, int]:
    return divmod(a, b)


quotient, remainder = divide(7, 2)
first, *rest = [1, 2, 3, 4]
*_, last = [1, 2, 3, 4]

print(quotient, remainder, first, rest, last)
```

```text
3 1 1 [2, 3, 4] 4
```

The starred name collects whatever is left into a list. Swapping needs no temporary: `a, b = b, a`.

## namedtuple gives the fields names

```python
from collections import namedtuple

Row = namedtuple("Row", ["name", "score"])

row = Row("ada", 10)
print(row.name, row.score, row[0])
print(row._replace(score=12))
```

`_replace` returns a new row, because the original cannot change. Named fields survive refactoring
better than indices: `row.score` fails loudly if the field is renamed, while `row[1]` silently reads
something else.

## When to prefer a dataclass

A `namedtuple` is a tuple, so it can be unpacked, compared by value and used as a dict key. A
dataclass carries types, defaults, methods and mutability. Pick the tuple when you want something
cheap and hashable, and a dataclass when the record has behaviour or needs to change.

## Check yourself

Turn a function that returns `(min_value, max_value, average)` into one that returns a named tuple.
Then write the call site both ways and say which one you would rather review.
