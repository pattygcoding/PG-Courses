---
title: JSON and CSV
summary: The two formats you will read most, the parts the standard library does not cover, and how to read them without loading everything.
chapter: Data
minutes: 14
status: draft
---

## JSON maps onto dicts and lists

```python
import json

payload = {"name": "ada", "tags": ["math", "code"], "active": True}
text = json.dumps(payload, indent=2, sort_keys=True)
print(text)
print(json.loads(text) == payload)
```

```text
{
  "active": true,
  "name": "ada",
  "tags": [
    "math",
    "code"
  ]
}
True
```

The types line up closely but not exactly. Objects become `dict`, arrays become `list`, and the scalars
map to `dict`, `list`, `str`, `int`, `float`, `bool` and `None`. Tuples come back as lists, integer
keys come back as strings, and a tuple used as a key is rejected outright because JSON keys must be
text.

## Teaching the encoder about your types

```python
import json
from datetime import date


def encode(value: object) -> object:
    if isinstance(value, date):
        return value.isoformat()
    raise TypeError(f"cannot encode {type(value).__name__}")


print(json.dumps({"when": date(2026, 3, 7)}, default=encode))
```

```text
{"when": "2026-03-07"}
```

`default` is called only for a type the encoder does not know. Raising from it beats letting the
encoder invent a string, because the error names the type that needs a rule. ISO 8601 is the format to
write: it sorts as text and it carries the offset.

## Checking what arrived

```python
import json


def load_config(text: str) -> dict[str, object]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError(f"config is not valid JSON: {error.msg}") from error
    if not isinstance(data, dict):
        raise ValueError("config must be a JSON object")
    return data
```

`json.loads` returns whatever the text held, including a bare number or a string. Checking the shape at
the boundary is what stops a dict shaped assumption from reaching the rest of the program.

## Streaming a file one record at a time

```python
import json
from pathlib import Path

with Path("rows.jsonl").open(encoding="utf-8") as handle:
    for line in handle:
        row = json.loads(line)
        print(row["id"])
```

One object per line is called JSON Lines, and it reads a record at a time. A single JSON array of the
same data has to be parsed whole, which is why exporters writing data that may grow use the line
format.

## CSV with DictReader

```python
import csv
from pathlib import Path

with Path("rows.csv").open(encoding="utf-8", newline="") as handle:
    for row in csv.DictReader(handle):
        print(row["name"], row["score"])
```

```text
ada 10
grace 7
```

`newline=""` is required. Without it the file object translates line endings before the csv module can
consider a newline inside a quoted field, which shows up as blank rows on Windows. Writing uses
`csv.writer` and `writerow`, and both handle quoting for you.

Splitting on commas by hand fails on quoted fields, embedded commas, embedded newlines and any other
dialect, and all of those appear in exported data.

## Check yourself

Read a CSV of names and scores, convert each score with an explicit error for bad input, and write the
result as JSON Lines. Then read the file you wrote back and confirm the round trip.
