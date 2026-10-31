---
title: for loops and the helpers that replace index arithmetic
summary: Iterating over anything, plus range, enumerate, zip and reversed, which remove most off-by-one bugs.
chapter: Control flow
minutes: 12
status: draft
---

## A for loop walks an iterable

```python
for name in ["ada", "grace", "alan"]:
    print(name)

for letter in "abc":
    print(letter)

for key in {"a": 1, "b": 2}:
    print(key)
```

Anything with `__iter__` works: lists, strings, dicts, sets, files, generators, database cursors. The
loop variable is rebound each pass and keeps its last value after the loop ends.

## The four helpers worth knowing

```pycon
>>> list(range(3)), list(range(1, 7, 2)), list(range(3, 0, -1))
([0, 1, 2], [1, 3, 5], [3, 2, 1])
>>> list(enumerate(["a", "b"], start=1))
[(1, 'a'), (2, 'b')]
>>> list(zip([1, 2, 3], "ab"))
[(1, 'a'), (2, 'b')]
>>> list(reversed([1, 2, 3]))
[3, 2, 1]
```

`zip` stops at the shortest input, so a length mismatch drops data without complaint. Ask for an
error when you expect the lengths to agree:

```pycon
>>> list(zip([1, 2, 3], "ab", strict=True))
```

```text
ValueError: zip() argument 2 is shorter than argument 1
```

## Stop looping over indices

```python
names = ["ada", "grace"]

for index in range(len(names)):
    print(index, names[index])

for index, name in enumerate(names):
    print(index, name)
```

The second version carries the intent in the call. Index arithmetic is where off-by-one errors live,
and `enumerate`, `zip` and `items()` remove the need for it.

## Walking a dict in a chosen order

```python
totals = {"ada": 3, "grace": 5}

for name, total in totals.items():
    print(name, total)

ranking = sorted(totals.items(), key=lambda pair: pair[1], reverse=True)
for name, total in ranking:
    print(name, total)
```

`sorted` returns a new list, so sorting the `items()` view does not touch the dict.

## Removing entries while looping

```python
totals = {"ada": 3, "grace": 5}

for name in list(totals):
    if totals[name] < 4:
        del totals[name]
```

Changing a dict or list while iterating raises or skips entries. Iterate over a copy of the keys, or
build a new collection with a comprehension.

## Check yourself

Given a list of names and a list of scores, print a ranking with positions. Then decide what the
code should do when the two lengths differ, and make `zip(..., strict=True)` enforce it.
