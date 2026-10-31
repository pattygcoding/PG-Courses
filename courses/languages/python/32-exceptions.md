---
title: Exceptions and the try statement
summary: try, except, else and finally, and the difference between handling an error and hiding one.
chapter: Errors and resources
minutes: 14
status: draft
---

## Four clauses, four jobs

```python
def parse_port(raw: str) -> int:
    try:
        port = int(raw)
    except ValueError:
        raise ValueError(f"port must be a number, got {raw!r}") from None
    else:
        if not 1 <= port <= 65535:
            raise ValueError(f"port out of range: {port}")
        return port
    finally:
        print("conversion attempted")
```

`except` runs on an error, `else` runs only when none happened, and `finally` always runs, including
when the function is leaving through a `return` or an exception. Keeping the `try` body to the single
operation being attempted is what makes `except` safe to reason about.

## Catch the narrowest error that makes sense

```python
try:
    value = int(raw)
except ValueError as error:
    print(f"bad input: {error}")
    value = 0
```

`except Exception` catches your own bugs alongside the expected failure, and it keeps the traceback
out of the log. `except BaseException` also swallows `KeyboardInterrupt` and `SystemExit`, so it
belongs only in a program that re-raises immediately.

## An empty handler is a bug

```python
try:
    save(record)
except Exception:
    pass
```

Nothing reached the log, the caller was told nothing, and the record is gone. Even a one line
`log.warning("save failed for %s", record.id)` leaves a trail.

## Raise the built-in that matches

| Situation                            | Exception             |
| ------------------------------------ | --------------------- |
| Wrong type passed in                 | `TypeError`           |
| Right type, impossible value         | `ValueError`          |
| Missing key                          | `KeyError`            |
| Missing file or directory            | `FileNotFoundError`   |
| Attribute does not exist             | `AttributeError`      |
| Object is in the wrong state         | `RuntimeError`        |
| Subclass left a method unimplemented | `NotImplementedError` |

Callers catch these names and test suites assert them. A custom exception where `ValueError` would do
adds a class, an import and a longer handler for no extra information.

## Check yourself

Write a function that converts text to a port number, with one message for a non number and a
different one for a value out of range. Call it with `"abc"`, `"0"`, `"70000"` and `"8080"`.
