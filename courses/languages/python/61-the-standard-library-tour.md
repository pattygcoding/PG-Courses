---
title: The standard library tour
summary: The modules worth knowing by name, so you reach for one instead of writing it again.
chapter: Advanced and the edges
minutes: 14
status: draft
---

## Files, text and data

| Module     | Use it for                               |
| ---------- | ---------------------------------------- |
| `pathlib`  | File and directory paths                 |
| `os`       | Environment, processes, low level paths  |
| `shutil`   | Copying trees, moving files, disk usage  |
| `tempfile` | Temporary files and directories          |
| `re`       | Regular expressions                      |
| `textwrap` | Wrapping and indenting text              |
| `difflib`  | Comparing sequences and producing a diff |
| `csv`      | Delimited files with quoting             |
| `json`     | JSON                                     |
| `sqlite3`  | A file based SQL database                |
| `struct`   | Packing and unpacking binary data        |

## Numbers, time and containers

| Module                    | Use it for                              |
| ------------------------- | --------------------------------------- |
| `datetime`                | Dates, times and durations              |
| `zoneinfo`                | The time zone database                  |
| `decimal` and `fractions` | Exact arithmetic                        |
| `statistics`              | Mean, median, variance                  |
| `random`                  | Random numbers and sampling             |
| `math` and `cmath`        | Real and complex maths                  |
| `bisect`                  | Binary search in a sorted list          |
| `heapq`                   | Priority queues                         |
| `array`                   | Compact numeric arrays                  |
| `collections`             | Counter, defaultdict, deque, namedtuple |

## Structure, tools and concurrency

| Module                                    | Use it for                     |
| ----------------------------------------- | ------------------------------ |
| `itertools` and `functools`               | Composition, caching, dispatch |
| `contextlib`                              | Context managers and cleanup   |
| `dataclasses`                             | Classes that hold data         |
| `enum`                                    | Named constants                |
| `abc`                                     | Abstract base classes          |
| `typing`                                  | Annotations                    |
| `logging`                                 | Application logs               |
| `argparse`                                | Command line arguments         |
| `configparser`                            | INI style configuration        |
| `subprocess`                              | Running another program        |
| `threading`, `multiprocessing`, `asyncio` | Concurrency                    |
| `unittest.mock`                           | Test doubles                   |

## The ones people forget exist

- `argparse` writes the `--help` text, the usage line and the error messages for a command, and hand rolled
  argument parsing has none of that and gets the edge cases wrong.
- `enum` gives a set of constants a name and a type, which is what stops a bare string spreading through a
  program.
- `bisect` searches a sorted list in logarithmic time, so a hand written binary search is unnecessary.
- `heapq` is the priority queue behind a scheduler or a top ten list.
- `shutil.disk_usage` and `shutil.which` answer questions you would otherwise shell out for.
- `textwrap.dedent` lets a multi line string in a test line up with the file.
- `difflib` produces a readable diff, which is what a test comparing two structures should print.
- `functools.cache` is one line and is often the entire performance fix.

## How to use this list

Read the module index in the documentation once. You will not remember it, and you will remember that
something exists, which is the part that saves an afternoon. Then check the standard library before adding a
dependency, because a module you already have is one fewer thing to install, audit and keep current.

## Check yourself

Pick three modules from these tables that you have never used and replace something in an existing script
with each one. Then open the module index and name two more that you had not heard of.
