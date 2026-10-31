---
title: Conditionals and comparison
summary: if, elif and else, and the spelling that stays readable as the conditions grow.
chapter: Control flow
minutes: 10
status: draft
---

## The shape

```python
def fee(total: float, member: bool) -> float:
    if total <= 0:
        raise ValueError("total must be positive")
    if member:
        return total * 0.05
    if total > 1000:
        return total * 0.1
    return 0.0
```

`if` takes any expression and uses its truthiness. The first matching branch runs and the rest are
skipped, so order carries meaning. Put the narrowest condition first.

## elif avoids re-testing

```python
def grade(score: int) -> str:
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    return "F"
```

Each `elif` runs only when everything above it failed, so `score >= 90` is not evaluated again. Four
independent `if` statements would test all four conditions and could match more than one.

## Long conditions

```python
if (is_active and not is_locked) or is_admin:
    grant_access()
```

A condition can span lines while it sits inside parentheses. That reads better than putting `and` at
the end of each line and carrying a backslash.

## A conditional expression returns a value

```python
label = "paid" if paid else "unpaid"
```

Use one when both sides are short expressions. As soon as either side needs real logic, write an
`if` and return early, because a nested conditional expression is read backwards by most people.

## Check yourself

Write a function that returns the shipping band for an order: free above 50, half price above 20,
full price below that. Then add an oversized-item rule and confirm the branch order still gives the
answer you want.
