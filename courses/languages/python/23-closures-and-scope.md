---
title: Closures, scope and nonlocal
summary: The lookup order for names, why closures share a loop variable, and when nonlocal is the honest fix.
chapter: Functions
minutes: 13
status: draft
---

## Names resolve in four places

Python looks a name up in the local scope, then any enclosing function, then the module globals, then
the builtins. That order is why a function can read a module level constant and also shadow it with a
parameter.

```python
RATE = 0.05


def fee(total: float, rate: float = RATE) -> float:
    return total * rate
```

## Reading from an enclosing scope is free

```python
def make_reader(values: list[int]):
    total = sum(values)

    def remaining(used: int) -> int:
        return total - used

    return remaining
```

`remaining` reads `total` from the enclosing frame, which stays alive as long as the closure does.
A closure is a function plus the names it captured, and that is the whole mechanism.

## Writing to an enclosing name needs nonlocal

```python
def make_counter(start: int = 0):
    count = start

    def increment() -> int:
        nonlocal count
        count += 1
        return count

    return increment


counter = make_counter(10)
print(counter(), counter(), counter())
```

```text
11 12 13
```

Without `nonlocal`, `count += 1` binds a new local name, and the right hand side raises
`UnboundLocalError`, because an assignment anywhere in a function makes that name local for the whole
body. `global` does the same for a module level name, and it is worth avoiding: a module level value
that several functions mutate is usually a small class waiting to be written.

## Closures share the loop variable

```python
callbacks = [lambda: n for n in range(3)]
print([callback() for callback in callbacks])
```

```text
[2, 2, 2]
```

Each lambda captured the same name, and the name held `2` by the time they ran. Bind the value as a
default, which is evaluated at definition:

```python
callbacks = [lambda n=n: n for n in range(3)]
print([callback() for callback in callbacks])
```

```text
[0, 1, 2]
```

## Check yourself

Write a function returning two closures that share one counter, one to increment and one to read.
Then write the same thing as a class and say which you would rather review.
