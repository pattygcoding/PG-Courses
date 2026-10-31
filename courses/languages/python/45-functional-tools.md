---
title: map, filter and reduce
summary: When a comprehension reads better than a higher order function, and the fold that is worth keeping.
chapter: Iteration and the standard library
minutes: 11
status: draft
---

## map and filter return iterators

```pycon
>>> list(map(str.upper, ["a", "b"]))
['A', 'B']
>>> list(filter(None, ["", "a", None, "b"]))
['a', 'b']
>>> list(map(len, ["ada", "grace"]))
[3, 5]
```

Both are lazy, so nothing runs until something consumes the result. That is useful when feeding a
function that stops early, and puzzling the first time you print one and see `<map object at 0x...>`.

`filter(None, values)` drops everything falsy, which is a compact way to clean a list of empty strings
and `None` together.

## A comprehension usually says more

```python
names = ["ada", "grace"]

print([name.upper() for name in names])
print([name for name in names if len(name) > 4])
```

The comprehension shows the expression and the filter in the order they apply, and it builds a set or a
dict just as easily. `map` earns its place when the function already has a name, as in
`map(str.upper, names)`, because then there is no lambda to read past.

## reduce folds a sequence into one value

```python
from functools import reduce

print(reduce(lambda total, value: total + value, [1, 2, 3, 4], 0))
print(reduce(lambda total, value: total * value, [1, 2, 3, 4], 1))
print(sum([1, 2, 3, 4]))
```

```text
10
24
10
```

The third argument is the starting value, and omitting it makes `reduce` raise on an empty sequence.
`sum`, `max`, `min`, `any` and `all` are the folds you need most of the time and they say what they
mean, so keep `reduce` for a fold with no built-in equivalent.

## Long chains stop being readable

A chain of higher order calls works while each stage is one named function, and stops working when the
stages are lambdas with several operations inside. A generator pipeline or a loop with good names beats
a chain you have to read twice, and the performance difference is not the deciding factor.

## Check yourself

Rewrite three `map` and `filter` calls as comprehensions, then rewrite two comprehensions as `map`
calls. Keep the version you would rather review and note which ones changed the type they returned.
