---
title: Sets and frozensets
summary: Membership tests that beat a list, deduplication with or without order, and the set algebra for comparisons.
chapter: Collections
minutes: 11
status: draft
---

## A set holds unique values

```pycon
>>> seen = {"a", "b"}
>>> seen.add("a")
>>> len(seen)
2
>>> "a" in seen
True
>>> 3 in [1, 2, 3], 3 in {1, 2, 3}
(True, True)
```

Membership is a hash lookup, so `x in a_set` costs roughly the same whatever the size, while `x in a
list` walks the list. That difference decides whether a loop over 100,000 rows takes seconds or
hours.

An empty set needs `set()`, because the braces are taken:

```pycon
>>> type({}), type(set())
(<class 'dict'>, <class 'set'>)
```

## Set algebra

```pycon
>>> a, b = {1, 2, 3}, {3, 4}
>>> sorted(a | b), sorted(a & b), sorted(a - b), sorted(a ^ b)
([1, 2, 3, 4], [3], [1, 2], [1, 2, 4])
>>> a <= {1, 2, 3, 4}
True
```

Union, intersection, difference and symmetric difference, plus subset tests. A set has no order, so
the sorted calls above are there to make the output stable enough to show.

## Deduplication, with or without order

```python
names = ["ada", "grace", "ada"]

print(sorted(set(names)))
print(list(dict.fromkeys(names)))
```

```text
['ada', 'grace']
['ada', 'grace']
```

`set(names)` drops duplicates and gives up the original order. `dict.fromkeys(names)` keeps first
appearance order, which is usually what a report wants.

## frozenset is hashable

```pycon
>>> groups = {frozenset({"a", "b"}): 1}
>>> groups[frozenset({"b", "a"})]
1
```

A `frozenset` cannot change, so it can be a dict key or a member of another set. A regular set cannot
be either, because modifying it would change its hash.

## Check yourself

Given two lists of user names, find the ones in both, the ones only in the first, and the number of
duplicates. Then say which answers want a set and which want a list.
