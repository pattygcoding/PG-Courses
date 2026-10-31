---
title: The collections module
summary: Counter, defaultdict, deque and ChainMap, and the small problem each one removes.
chapter: Iteration and the standard library
minutes: 12
status: draft
---

## Counter counts and sorts by count

```python
from collections import Counter

words = "the quick the lazy the".split()
counts = Counter(words)

print(counts["the"])
print(counts["missing"])
print(counts.most_common(2))
print(sum(counts.values()))
```

```text
3
0
[('the', 3), ('quick', 1)]
5
```

A missing key returns `0` rather than raising, because `Counter` is a dict subclass with a default of
zero. It also supports arithmetic between counters, so `Counter("ab") + Counter("bc")` sums the counts,
which is what comparing two sets of events needs.

## defaultdict removes the key check

```python
from collections import defaultdict

by_team: defaultdict[str, list[str]] = defaultdict(list)

for team, name in [("red", "ada"), ("red", "alan"), ("blue", "grace")]:
    by_team[team].append(name)

print(dict(by_team))
```

```text
{'red': ['ada', 'alan'], 'blue': ['grace']}
```

The factory runs only when a key is missing, and reading a missing key with `[]` inserts an empty
value. Use `.get(key)` to look without inserting, because plain indexing changes the dict as a side
effect and that surprises readers.

## deque is a queue at both ends

```python
from collections import deque

queue: deque[str] = deque(["a", "b"])
queue.append("c")
queue.appendleft("z")

print(queue.popleft(), queue.pop())
print(list(queue))
```

```text
z c
['a', 'b']
```

`list.pop(0)` moves every remaining element, so a queue built from a list is quadratic in the length of
the queue. `deque` is constant time at both ends. It also takes a `maxlen`, which drops from the
opposite end automatically and is exactly what a rolling window of recent events needs.

## OrderedDict and ChainMap

A plain dict keeps insertion order, so `OrderedDict` is only worth importing for its two extra
methods, `move_to_end` and `popitem(last=False)`. `ChainMap` looks through several dicts in order, which
suits layered settings better than merging them:

```python
from collections import ChainMap

defaults = {"timeout": 5, "retries": 3}
overrides = {"timeout": 30}

config = ChainMap(overrides, defaults)
print(config["timeout"], config["retries"])
```

```text
30 3
```

The lookup order decides which value wins, and the underlying dicts stay separate.

## Check yourself

Count words with `Counter`, group rows by a field with `defaultdict`, and keep the last ten events with
a bounded `deque`. Then write each one with plain dict and list code and compare the line counts.
