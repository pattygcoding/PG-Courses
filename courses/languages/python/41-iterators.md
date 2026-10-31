---
title: Iterators and the iterator protocol
summary: What a for loop actually calls, and why an exhausted iterator stays exhausted.
chapter: Iteration and the standard library
minutes: 12
status: draft
---

## Two methods make an iterable

```python
class Countdown:
    def __init__(self, start: int) -> None:
        self.current = start

    def __iter__(self) -> "Countdown":
        return self

    def __next__(self) -> int:
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1


print(list(Countdown(3)))
print(sum(Countdown(3)))
```

```text
[3, 2, 1]
6
```

`__iter__` returns the iterator and `__next__` returns the next value or raises `StopIteration` to
signal the end. A `for` loop calls `iter()` once and then `next()` until that exception, which is the
entire protocol.

## An iterator is a single-use cursor

```pycon
>>> values = iter([1, 2, 3])
>>> list(values)
[1, 2, 3]
>>> list(values)
[]
```

A list can be walked as many times as you like, because `iter()` builds a fresh iterator each time. An
iterator is the cursor itself, so once it reaches the end it stays there. That is why a generator
expression cannot be summed twice, and why a function returning a generator surprises a caller who
expected a list.

## iter with a sentinel

```python
with open("rows.csv", encoding="utf-8") as handle:
    for line in iter(handle.readline, ""):
        print(line.rstrip())
```

`iter(callable, sentinel)` calls the function until it returns the sentinel. It is the compact form of
a read-until-empty loop, and it works with any zero argument callable.

## Membership tests consume

```python
def numbers():
    for value in range(5):
        yield value


stream = numbers()
print(3 in stream)
print(1 in stream)
```

```text
True
False
```

The first test walked the generator up to `3`, so the second test only sees `4` and answers `False`.
Anything that needs repeated access needs a list, and building one should be a decision you make
rather than one the code forces.

## Check yourself

Write a class that iterates the lines of a file lazily, with `__iter__` and `__next__` written by hand.
Then replace the pair with a generator and confirm the behaviour did not change.
