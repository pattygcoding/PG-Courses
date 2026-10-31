---
title: itertools
summary: Lazy building blocks for chaining, grouping, slicing and combining sequences.
chapter: Iteration and the standard library
minutes: 13
status: draft
---

## Chaining, slicing and repeating

```python
from itertools import chain, islice, repeat

print(list(chain([1, 2], "ab", (3,))))
print(list(islice(range(100), 3)))
print(list(repeat("x", 3)))
```

```text
[1, 2, 'a', 'b', 3]
[0, 1, 2]
['x', 'x', 'x']
```

`chain` walks several iterables as one. `islice` takes the first n items without building the whole
sequence, which is what you want when the source is a file. `repeat` yields the same value a set number
of times, or forever when the count is omitted.

## groupby needs sorted input

```python
from itertools import groupby
from operator import itemgetter

rows = [
    {"team": "red", "name": "ada"},
    {"team": "red", "name": "alan"},
    {"team": "blue", "name": "grace"},
]

rows.sort(key=itemgetter("team"))
for team, group in groupby(rows, key=itemgetter("team")):
    print(team, [row["name"] for row in group])
```

```text
red ['ada', 'alan']
blue ['grace']
```

A new group starts every time the key changes, so unsorted input produces the same team more than once.
Each group is an iterator that is exhausted as the loop advances, which is why the names are collected
into a list inside the body.

## The combinatorial helpers

```python
from itertools import combinations, permutations, product

print(list(combinations([1, 2, 3], 2)))
print(list(permutations([1, 2], 2)))
print(list(product("ab", repeat=2)))
```

```text
[(1, 2), (1, 3), (2, 3)]
[(1, 2), (2, 1)]
[('a', 'a'), ('a', 'b'), ('b', 'a'), ('b', 'b')]
```

`combinations` ignores order, `permutations` keeps it, and `product` is a nested loop written as a call.
All three grow fast: ten items taken four at a time is 210 combinations and 5040 permutations, and
twenty taken ten at a time is 184756 combinations. Work out the size before iterating one.

## Running totals and neighbouring pairs

```python
from itertools import accumulate, pairwise

print(list(accumulate([1, 2, 3, 4])))
print(list(pairwise([1, 2, 3, 4])))
print(list(accumulate([1, 2, 3], initial=0)))
```

```text
[1, 3, 6, 10]
[(1, 2), (2, 3), (3, 4)]
[0, 1, 3, 6]
```

`accumulate` is a running fold and accepts any two argument function, so `accumulate(values, max)` gives
a running maximum and `accumulate(values, max, initial=float("-inf"))` handles an empty sequence.
`pairwise` yields overlapping pairs, replacing the `zip(values, values[1:])` idiom without copying the
sequence.

## Check yourself

Group records by month and count each group. Then compare `chain` plus `islice` against concatenating
lists and slicing, and note which approach built the whole sequence in memory first.
