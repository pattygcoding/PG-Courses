---
title: Installing Python and choosing a version
summary: How to get an interpreter that matches the machines you deploy to, and how to stop the version question coming back.
chapter: Getting started
minutes: 10
status: draft
---

## Pick the oldest version you must support

Write for the oldest interpreter you have to run on, and use a newer one locally for the sharper
error messages. Wanting a feature from a later release is a decision about who can run your code,
so make it on purpose rather than discovering it in production.

The landmarks worth knowing:

| Feature                                          | Version |
| ------------------------------------------------ | ------- |
| f-strings                                        | 3.6     |
| dataclasses                                      | 3.7     |
| The `:=` assignment expression                   | 3.8     |
| `zoneinfo` and the dict merge operator           | 3.9     |
| The `match` statement                            | 3.10    |
| `tomllib`, exception groups, `asyncio.TaskGroup` | 3.11    |
| The `type` statement and `itertools.batched`     | 3.12    |

## Check what you have

```bash
python3 --version
```

On Windows the command is usually `py -3.12` or `python`, and `py --list` prints every install you
have. On macOS and Linux use `python3`, because `python` may be missing or may point at an older
interpreter that the system needs for itself.

## Keep the interpreter off your system path

Every project should name the interpreter it needs rather than relying on whatever is first on the
path. The next lesson sets up a virtual environment for exactly that reason.

## Check yourself

Run `python3 --version` and `py --list` where they exist, then find out which version your
deployment target ships.
