---
title: How Python runs your code
summary: The interpreter, bytecode, and why the same file behaves differently as a script and as a module.
chapter: Getting started
minutes: 12
status: draft
---

## The short version

Python reads your file, compiles it to bytecode, and runs that bytecode on a virtual machine. The
bytecode is cached in `__pycache__`, which is why a second run of a large program starts faster
than the first. Nothing else is unusual: a module is any `.py` file, and the interpreter starts at
the top of the file it was handed.

## The same file, two ways to run it

```bash
python report.py
python -m report
```

Both run `report.py`. The difference is what Python treats as the top level. With `python
report.py`, the file is the entry point. With `python -m report`, Python imports `report` as a
module first, which matters once the code lives inside a package and needs its relative imports to
resolve.

## `__name__` says which one happened

```python
def main() -> int:
    print("running")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

`__name__` is `"__main__"` when the file was run directly, and the module name when it was
imported. The guard above keeps `import report` from printing anything, and `SystemExit` hands the
return value to the shell as an exit code.

## Check yourself

Run a file both ways and print `__name__` in each. Then delete `__pycache__` and confirm nothing
breaks.
