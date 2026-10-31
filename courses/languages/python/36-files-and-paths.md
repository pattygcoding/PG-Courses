---
title: Files, paths and the filesystem
summary: pathlib, reading and writing without leaking handles, and the path handling that survives another operating system.
chapter: Data
minutes: 13
status: draft
---

## Path names a location, and joins with a slash

```python
from pathlib import Path

root = Path("data")
report = root / "2026" / "report.csv"

print(report)
print(report.name, report.stem, report.suffix)
print(report.parent)
```

```text
data/2026/report.csv
report.csv report .csv
data/2026
```

The `/` operator joins and returns a `Path`, so no separator is ever concatenated by hand. Printing a
path uses the separator of the current system, which is why the same code reads correctly on Windows
and on Linux.

## Reading and writing

```python
from pathlib import Path

path = Path("notes.txt")

path.write_text("first line\n", encoding="utf-8")
text = path.read_text(encoding="utf-8")

with path.open("a", encoding="utf-8") as handle:
    handle.write("second line\n")
```

`read_text` and `write_text` open and close for you, which suits a whole file that fits in memory. For
a large file or an append, use `with path.open(...)` so the handle closes on every exit path.

## Iterating a file that does not fit in memory

```python
from pathlib import Path

total = 0
with Path("huge.csv").open(encoding="utf-8") as handle:
    for line in handle:
        total += len(line)
```

A file object yields one line at a time, so a ten gigabyte log costs the same memory as a ten line
one. `readlines()` on the same file would build a list of every line first.

## Creating directories and checking state

```python
from pathlib import Path

path = Path("out/report.txt")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text("ready\n", encoding="utf-8")

print(path.is_file(), path.stat().st_size)
```

`parents=True` creates missing directories up the chain and `exist_ok=True` makes the call idempotent,
so it is safe inside a loop. `exists()` is true for files and directories; use `is_file()` and
`is_dir()` when the difference matters.

Testing `exists()` and then opening is a race whenever something else may write to the same directory.
Where that is possible, open the file and handle `FileNotFoundError`, because the error answers the
question you actually asked.

## Walking a tree

```python
from pathlib import Path

root = Path("data")
for path in sorted(root.rglob("*.csv")):
    print(path.relative_to(root))
```

`glob` matches one level and `rglob` matches any depth, with shell style `*` and `**`. Sort the result
when the order matters, because the filesystem does not promise one.

## Check yourself

Write a script that creates a nested output directory, writes a file into it, lists every text file
under a source directory, and prints each path relative to that directory. Run it twice and confirm
the second run overwrites rather than failing.
