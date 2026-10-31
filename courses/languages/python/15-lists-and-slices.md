---
title: Lists and slices
summary: The workhorse sequence, and the slice syntax that makes copying, reversing and chunking cheap.
chapter: Collections
minutes: 13
status: draft
---

## Lists are ordered and mutable

```pycon
>>> queue = ["a", "b"]
>>> queue.append("c")
>>> queue
['a', 'b', 'c']
>>> queue.insert(0, "z")
>>> queue
['z', 'a', 'b', 'c']
>>> queue.pop()
'c'
>>> queue
['z', 'a', 'b']
```

`append` and `pop` work at the end and are constant time. `insert(0, value)` and `pop(0)` move every
element, so they cost more as the list grows. `collections.deque` exists for the queue at both ends
case.

## Slicing

```pycon
>>> values = [0, 1, 2, 3, 4, 5]
>>> values[1:4]
[1, 2, 3]
>>> values[:2], values[4:]
([0, 1], [4, 5])
>>> values[::2]
[0, 2, 4]
>>> values[::-1]
[5, 4, 3, 2, 1]
>>> values[1:4] = [9]
>>> values
[0, 9, 4, 5]
```

A slice is `start:stop:step` with `stop` excluded. Negative indices count from the end, and out of
range slices clamp instead of raising, which is why `values[100:]` returns an empty list rather than
an error.

A slice always returns a new list, so `values[:]` is a shallow copy. That is the most common way a
copy happens by accident and the most common way one fails to happen when it was needed.

## Slice assignment replaces a run

```python
values = [0, 1, 2, 3, 4, 5]
values[1:6] = []
print(values)
```

```text
[0, 5]
```

The right side is an iterable, and it does not have to be the same length as the slice. The list
shrinks or grows to fit.

## Sorting in place, and the difference that makes

```pycon
>>> numbers = [3, 1, 2]
>>> numbers.sort()
>>> numbers
[1, 2, 3]
>>> sorted(numbers, reverse=True)
[3, 2, 1]
>>> numbers
[1, 2, 3]
```

`list.sort` mutates and returns `None`, so `numbers = numbers.sort()` is a bug that leaves you with
`None`. `sorted` takes any iterable and returns a new list.

## Check yourself

Reverse a list in place, then reverse it with a slice, then prove which one shared the original
object. Write down a case where the difference would cause a real bug.
