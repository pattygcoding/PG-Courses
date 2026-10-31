---
title: Raising, chaining and custom hierarchies
summary: How one error becomes another, and how to design a tree of exceptions a caller can catch precisely.
chapter: Errors and resources
minutes: 12
status: draft
---

## Chaining keeps the original error

```python
import json


def read_config(path: str) -> dict[str, object]:
    try:
        with open(path, encoding="utf-8") as handle:
            return json.loads(handle.read())
    except FileNotFoundError as error:
        raise ConfigError(f"no config at {path}") from error
```

`raise ... from error` sets the cause, and the traceback prints both errors, so the file name and the
original errno survive the translation. Two neighbours are worth knowing:

```python
raise ConfigError("bad config") from None
raise ConfigError("bad config")
```

`from None` suppresses the chained error, which is right when the original is noise. Leaving the
clause off still records a context, printed as "during handling of the above exception". The two read
very differently in a log at two in the morning, so pick on purpose.

## A small hierarchy beats one error with a flag

```python
class AppError(Exception):
    """Base class for errors this application raises."""


class ConfigError(AppError):
    """The configuration is missing or invalid."""


class UpstreamError(AppError):
    """A dependency returned an error or timed out."""
```

Callers then choose how precise to be:

```python
try:
    run()
except ConfigError:
    exit(2)
except AppError as error:
    print(f"failed: {error}")
    exit(1)
```

One base class lets a caller catch everything the program raises without catching the interpreter's
own errors, and adding a subclass later does not break existing handlers.

## Attach data, do not parse the message

```python
class UpstreamError(AppError):
    def __init__(self, service: str, status: int) -> None:
        super().__init__(f"{service} returned {status}")
        self.service = service
        self.status = status
```

The message is for a person and the attributes are for code that retries, reports or routes. Anything
that reads your own message text later is a bug waiting for a wording change.

## Check yourself

Write a two level hierarchy for a small service, raise each from a lower level error with chaining,
and catch them at two levels of precision. Then check the traceback to confirm the cause is printed.
