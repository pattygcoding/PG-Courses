---
title: Comprehensions and generator expressions
summary: Building a container in one expression, and the point where a generator is the better tool.
chapter: Collections
minutes: 13
status: draft
---

## Four container types, one syntax

```python
values = [1, 2, 3, 4]

print([n * n for n in values])
print({n * n for n in values})
print({n: n * n for n in values})
print(tuple(n * n for n in values))
```

```text
[1, 4, 9, 16]
{1, 4, 9, 16}
{1: 1, 2: 4, 3: 9, 4: 16}
(1, 4, 9, 16)
```

The brackets decide the container: square for a list, braces with one expression for a set, braces
with a colon for a dict. Round brackets give a generator, which is a different thing wearing similar
clothes.

## Filtering and transforming in the same pass

```python
words = ["Ada", "grace", "ALAN"]

print([word.lower() for word in words if len(word) > 3])
print([(word.lower(), len(word)) for word in words])
```

```text
['grace', 'alan']
[('ada', 3), ('grace', 5), ('alan', 4)]
```

Read it as build this, from that, when this holds. With two loops the rightmost one changes fastest:

```python
print([(x, y) for x in range(2) for y in "ab"])
```

```text
[(0, 'a'), (0, 'b'), (1, 'a'), (1, 'b')]
```

## A generator expression produces values on demand

```pycon
>>> squares = (n * n for n in range(1_000_000))
>>> next(squares), next(squares)
(0, 1)
>>> sum(n * n for n in range(1000))
332833500
```

A generator holds one value at a time, so it never allocates the whole sequence. That makes it the
right argument for `sum`, `any`, `all`, `min` and `max`, and the wrong choice if you need to walk
the values twice.

## Where to stop

One loop and one condition stays readable. A comprehension with nested loops, a conditional
expression and a call inside it should become a named function, because the reader needs a label for
what it produces. Speed is not the argument: a comprehension of that shape is not measurably faster
than a loop.

## Check yourself

Turn a nine line loop that filters and transforms into a comprehension. Then take a three line
comprehension and turn it back into a loop with a name. Keep whichever version you would rather
review.
