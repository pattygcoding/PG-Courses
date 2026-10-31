---
title: Idioms and the traps worth naming
summary: The short forms a Python reader expects, and the mistakes that cost an afternoon each.
chapter: Advanced and the edges
minutes: 13
status: draft
---

## Short forms a reader already knows

```python
# swap without a temporary
a, b = b, a

# build a dict from two sequences
lookup = dict(zip(keys, values, strict=True))

# a missing key with a default
count = totals.get(key, 0)

# merge two mappings without mutating either
merged = {**base, **overrides}

# unpack and discard the rest
first, *_ = row
```

Each one is the short form of something longer, and every Python reader recognises all of them. Writing the
long form is not wrong, and it does slow the next person down.

## The traps

| Trap                          | What happens                           | Fix                                      |
| ----------------------------- | -------------------------------------- | ---------------------------------------- |
| Mutable default argument      | Every call shares one object           | Use `None` and build inside              |
| Falsy mixed up with missing   | `if not value` also skips `0` and `""` | Test `is None` when that is the question |
| `x = x.sort()`                | You get `None`                         | Use `sorted()`, or call `sort()` alone   |
| `/` always returns a float    | `4 / 2` is `2.0`                       | Use `//` for an integer result           |
| Loop variable leaks           | The `for` leaves its last value bound  | Keep the loop inside a function          |
| Late binding in a closure     | Every closure sees the last value      | Bind it with a default argument          |
| `is` used for numbers         | Works for small integers, then stops   | Compare with `==`                        |
| Dict changed while looping    | `RuntimeError`                         | Loop over `list(d)`, or build a new dict |
| Float equality                | `0.1 + 0.2 != 0.3`                     | `math.isclose`, or `Decimal`             |
| Bare `except:`                | Catches `KeyboardInterrupt` too        | Catch a named exception                  |
| Regex without a raw string    | Backslashes are read twice             | Write `r"\d+"`                           |
| Attribute assigned on a class | Every instance sees the change         | Assign on the instance, or in `__init__` |

## The one that costs the most time

The mutable default produces a bug in a module far from its cause, often weeks after the code shipped. A
function that returns a growing list on each call looks like a caching bug or a database problem until
somebody reads the signature. Writing the `None` form by habit removes the whole class of bug.

## Why a code review misses these

Every trap in the table reads as ordinary code. A review looking at names and structure will pass all of
them, so the check has to be specific: read the signatures for mutable defaults, look for `except:` with no
type, and look for `==` against a float. That takes seconds per file and catches the ones that matter.

## Check yourself

Find at least three of the traps in code you have already written and fix them. For each one, write the test
that would have caught it before the bug reached anybody.
