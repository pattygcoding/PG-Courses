---
title: Sorting, key functions and copying
summary: Sort by anything, use stability instead of composite keys, and know which copies are shallow.
chapter: Collections
minutes: 13
status: draft
---

## Sort with a key function

```python
from operator import itemgetter

rows = [("ada", 10), ("grace", 7), ("alan", 10)]

print(sorted(rows))
print(sorted(rows, key=itemgetter(1)))
print(sorted(rows, key=lambda row: (-row[1], row[0])))
```

```text
[('ada', 10), ('alan', 10), ('grace', 7)]
[('grace', 7), ('ada', 10), ('alan', 10)]
[('ada', 10), ('alan', 10), ('grace', 7)]
```

Without a key, tuples compare element by element, so the first result is sorted by name.
`itemgetter(1)` sorts by score, and the lambda returns a tuple so scores descend and names break the
ties.

## Stability removes the need for composite keys

```python
from operator import itemgetter

rows = [("ada", 10), ("grace", 7), ("alan", 10), ("bob", 7)]

print(sorted(rows, key=itemgetter(1), reverse=True))
print(sorted(sorted(rows, key=itemgetter(0)), key=itemgetter(1), reverse=True))
```

```text
[('ada', 10), ('alan', 10), ('grace', 7), ('bob', 7)]
[('ada', 10), ('alan', 10), ('bob', 7), ('grace', 7)]
```

The first sorts by score alone, so the ties come out in the order they were given. The second sorts
by name first and by score second, so ties come out alphabetical. Python's sort is stable, which
means sorting twice, least significant key first, is a legitimate technique rather than a trick.

## Keys must compare

```python
sorted([1, "two"])
```

```text
TypeError: '<' not supported between instances of 'str' and 'int'
```

Mixed types raise instead of guessing. Coerce in the key, and decide on purpose where a missing
value sorts, because `None` will not compare with an `int` either.

## Shallow and deep copies

```pycon
>>> original = [[1, 2], [3, 4]]
>>> shallow = original[:]
>>> shallow[0].append(99)
>>> original
[[1, 2, 99], [3, 4]]
```

The outer list was copied and the inner lists were shared, so the append reached the original.
Slices, `list(...)`, `dict(...)` and `copy.copy` all copy one level.

```pycon
>>> import copy
>>> deep = copy.deepcopy(original)
>>> deep[0].append(1)
>>> original[0]
[1, 2, 99]
```

`deepcopy` copies every level, handles reference cycles and costs more. Use it when nested objects
must not be shared.

The same trap hides in a default argument, which is evaluated once:

```python
def collect(value: str, into: list[str] = []) -> list[str]:
    into.append(value)
    return into
```

Every call without a second argument shares that one list. Use `None` as the default and build the
list inside the function.

## Check yourself

Sort a list of dicts by two keys, one of them descending. Then copy a nested structure with a slice,
with `copy.copy` and with `copy.deepcopy`, and show which ones still share the inner objects.
