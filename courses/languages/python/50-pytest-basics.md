---
title: pytest basics
summary: Test functions, assertions that print values, and running one test at a time.
chapter: Testing
minutes: 12
status: draft
---

## A test is a function with the right name

```python
# tests/test_pricing.py
from shop.pricing import total


def test_total_sums_prices() -> None:
    assert total([100, 250]) == 350


def test_total_of_nothing_is_zero() -> None:
    assert total([]) == 0
```

pytest collects files named `test_*.py`, functions named `test_*`, and classes named `Test*`. There is
no base class and no registration step: the name is the registration.

```bash
python -m pytest
python -m pytest tests/test_pricing.py::test_total_of_nothing_is_zero
python -m pytest -k "total and not zero"
python -m pytest -x
```

The node id after the double colon runs one test. `-k` selects by name expression. `-x` stops at the
first failure, which is what you want while fixing something.

## assert is enough

pytest rewrites an `assert` so a failure prints the values on both sides rather than only the line
number. That is why `assertEqual` and friends are unnecessary, and why the expression on the right
should be the one you would want to see.

```python
def test_total_ignores_small_change() -> None:
    assert total([100, 250]) == 350
```

A failure here reports `assert 351 == 350`, which is more useful than a message you wrote yourself.

## Testing that a call raises

```python
import pytest


def test_negative_amount_is_rejected() -> None:
    with pytest.raises(ValueError, match="must be positive"):
        withdraw(100, -5)
```

`pytest.raises` fails when nothing is raised, and `match` checks the message, so the test does not pass
on a different error with a similar name.

## Floats and approximate values

```python
import pytest


def test_average() -> None:
    assert average([1, 2, 2]) == pytest.approx(1.6666666)
```

`pytest.approx` compares within a tolerance, which removes the `round(value, 6) ==` habit and the
flakiness that comes with it.

## Where to start

Cover the branches you would explain to a new colleague: the ordinary case, the empty input, a value out
of range, and the error that should be raised. Then add a test for every bug you fix, because that test
has a proven chance of catching something.

## Check yourself

Write tests for a function with three branches, run one of them by node id, and run a subset with `-k`.
Then break the function on purpose and confirm the failure message names both values.
