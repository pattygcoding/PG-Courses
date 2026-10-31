---
title: Logging, assertions and debugging
summary: A log worth reading in production, assertions that state a fact, and the debugger that beats print.
chapter: Errors and resources
minutes: 13
status: draft
---

## logging is not print with a prefix

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

log = logging.getLogger(__name__)

log.debug("starting")
log.info("loaded %d rows", count)
log.error("failed to save %s", record_id, exc_info=True)
```

A logger has a level, a name and a destination, so the same code can be silent in a test and verbose
in production. `%(name)s` picks up `__name__`, which is how you raise the level for one module without
touching the rest of the program.

## Format lazily

```python
count = 3

log.info("loaded %d rows", count)  # formatted only when the level is on
log.info(f"loaded {count} rows")  # formatted on every call
```

An f-string is built before the call, so a debug line costs time even when debug logging is off. One
line is nothing; a debug log inside a loop over a million rows is measurable.

`exc_info=True` inside an `except` block attaches the traceback, which is the difference between a log
line that tells you something failed and one that tells you where.

## Exceptions are for exceptional flow

Using exceptions for ordinary branching is slower and harder to read than a check, and using return
values for genuinely broken state loses the traceback and every handler in between. Send a missing
optional key to a default with `get`, and let a corrupt file raise.

## assert states a fact, not a check

```python
def withdraw(balance: int, amount: int) -> int:
    assert amount > 0, "amount must be positive"
    return balance - amount
```

Python removes every `assert` when it is run with `-O`, so an assert cannot be the guard that protects
real data. Use it for conditions that make the code below it correct, and raise a real exception for
anything a caller can get wrong.

## The debugger answers questions print cannot

```python
def process(rows: list[dict[str, str]]) -> None:
    for index, row in enumerate(rows):
        if index == 3:
            breakpoint()
        handle(row)
```

`breakpoint()` stops in `pdb` at that line. `p expression` prints, `n` runs the next line, `s` steps
into a call, `w` shows the stack, `pp` pretty prints a structure, and `q` quits. Watching a nested
dictionary change across three frames is the case print handles badly.

For code you cannot stop, `python -X dev script.py` turns on development mode, which reports unclosed
files and other warnings that are off by default.

## Check yourself

Replace the print calls in a small script with loggers at three levels. Run it with the level at INFO
and again at DEBUG, and confirm the output changes without editing the code.
