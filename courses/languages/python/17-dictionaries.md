---
title: Dicts and their views
summary: Key lookups, insertion order, and the methods that replace defensive checking.
chapter: Collections
minutes: 14
status: draft
---

## Keys map to values, in insertion order

```pycon
>>> totals = {"ada": 3, "grace": 5}
>>> totals["ada"]
3
>>> totals["nobody"]
Traceback (most recent call last):
KeyError: 'nobody'
```

A dict remembers the order keys were first inserted, which makes it usable for anything built up
incrementally and then printed. Lookup by key is close to constant time whatever the size, because
the key is hashed.

## Reading without crashing

```pycon
>>> totals.get("nobody"), totals.get("nobody", 0)
(None, 0)
>>> "ada" in totals
True
>>> totals.setdefault("alan", 0)
0
>>> len(totals)
3
```

`get` returns `None` or a supplied default. `setdefault` inserts and returns in one step, which is
what a counting loop wants before `collections.Counter` becomes the better answer.

## Views reflect the dict

```pycon
>>> list(totals.keys()), list(totals.values())
(['ada', 'grace', 'alan'], [3, 5, 0])
>>> list(totals.items())
[('ada', 3), ('grace', 5), ('alan', 0)]
```

`keys`, `values` and `items` return views rather than copies. They stay current, and iterating one
while the dict changes size raises `RuntimeError: dictionary changed size during iteration`. Copy
the keys first when that is the plan.

## Merging

```pycon
>>> {"a": 1} | {"b": 2}
{'a': 1, 'b': 2}
>>> {"a": 1} | {"a": 2}
{'a': 2}
```

The `|` operator returns a new dict and the right side wins. `|=` updates in place. Before 3.9 the
same result came from `{**left, **right}` or `left.update(right)`.

## Building a dict from two sequences

```python
names = ["ada", "grace"]
scores = [3, 5]
print(dict(zip(names, scores, strict=True)))
```

```text
{'ada': 3, 'grace': 5}
```

## Check yourself

Count the words in a sentence three ways: with `setdefault`, with `collections.Counter`, and with
`collections.defaultdict`. Then say which one you would put in a code review and why.
