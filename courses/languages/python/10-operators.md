---
title: Operators, chaining and the walrus
summary: Chained comparisons, short circuiting that returns operands, and the assignment expression that removes a duplicate call.
chapter: Language basics
minutes: 12
status: draft
---

## Comparisons chain, and the middle runs once

```pycon
>>> x = 5
>>> 0 <= x < 10
True
>>> 0 <= x < 3
False
```

The middle expression is evaluated one time, so `lower() < probe() < upper()` does not call `probe`
twice. Written out, it is `0 <= x and x < 10`, and the chained form says what it means.

## Boolean operators return an operand

```pycon
>>> "" or "fallback"
'fallback'
>>> "value" and "second"
'second'
>>> 0 or []
[]
```

`or` returns the first truthy operand, `and` returns the last one it evaluated, and both stop as
soon as the answer is settled. That is why `0 or []` prints `[]`: neither operand is truthy, so
`or` hands back the last one it looked at.

The habit this enables:

```python
def display_name(raw: str | None) -> str:
    return (raw or "").strip() or "anonymous"
```

The short circuit also guards the next test, which is the common way to avoid a `None` crash:

```python
def has_token(config: dict[str, str]) -> bool:
    return "token" in config and config["token"] != ""
```

## The walrus assignment

```python
import re

line = "user=ada id=42"
if (match := re.search(r"id=(\d+)", line)) is not None:
    print(match.group(1))
```

Without `:=` you either call `search` twice or add an assignment line above the `if`. Use it where
it removes a duplicate, and leave it out when it piles two conditions onto one line.

## Bitwise operators on integers

```pycon
>>> 0b1010 & 0b0110, 0b1010 | 0b0110, 0b1010 ^ 0b0110
(2, 14, 12)
>>> 1 << 10, 1024 >> 3
(1024, 128)
```

These work on the binary representation, so `&` is a mask, `|` sets bits and `^` flips them. On
`bool` they behave as non-short-circuiting and, or and exclusive or.

## Check yourself

Rewrite the snippet below so the lookup runs once, then say why the `and` makes it safe:

```python
if lookup(key) is not None and lookup(key).strip() != "":
    ...
```
