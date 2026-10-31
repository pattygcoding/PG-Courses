---
title: Numbers, precision and rounding
summary: Integers grow without limit, floats are binary fractions, and money needs a different type.
chapter: Language basics
minutes: 14
status: draft
---

## Integers have no fixed width

```pycon
>>> 2 ** 100
1267650600228229401496703205376
>>> 10 ** 30 + 1 == 10 ** 30
False
```

An `int` grows as large as memory allows, so there is no silent overflow to guard against. The cost
is speed: arithmetic on very large integers is slower than on machine-word sized ones, which shows
up in tight loops.

## Floats are binary fractions

```pycon
>>> 0.1 + 0.2
0.30000000000000004
>>> 0.1 + 0.2 == 0.3
False
>>> 1 / 3
0.3333333333333333
```

A `float` is a 64-bit binary value, so `0.1` has no exact representation. Compare with a tolerance
rather than equality:

```pycon
>>> import math
>>> math.isclose(0.1 + 0.2, 0.3)
True
```

## Exact decimal arithmetic

```pycon
>>> from decimal import Decimal
>>> Decimal("0.1") + Decimal("0.2")
Decimal('0.3')
```

`Decimal` stores decimal digits, so it agrees with what a customer sees on a receipt. Build it from
a string, because `Decimal(0.1)` carries the binary error across. `Fraction` is the other exact
type, and it keeps results as a ratio:

```pycon
>>> from fractions import Fraction
>>> Fraction(1, 3) + Fraction(1, 6)
Fraction(1, 2)
```

## Division, modulo and rounding

```pycon
>>> 7 // 2, 7 % 2, divmod(7, 2)
(3, 1, (3, 1))
>>> -7 // 2, -7 % 2
(-4, 1)
>>> round(2.5), round(3.5)
(2, 4)
```

`//` floors instead of truncating toward zero, so `-7 // 2` is `-4` and `-7 % 2` is `1`. `round`
breaks ties toward the even number, which is why `round(2.5)` is `2`.

## Check yourself

Compute `0.1 + 0.2` as a float, with `math.isclose`, and with `Decimal`. Then decide which one a
payments system should use for a running total, and write down why.
