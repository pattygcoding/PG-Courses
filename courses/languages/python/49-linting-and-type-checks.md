---
title: Formatting, linting and type checks
summary: Three tools that catch different mistakes, and how to run them without thinking about it.
chapter: Modules, tooling and packaging
minutes: 13
status: draft
---

## Formatting is not a discussion

```bash
python -m pip install ruff
ruff format .
ruff check --fix .
```

`ruff format` rewrites the layout and ends the argument about line breaks. `ruff check` finds unused
imports, shadowed names, mutable defaults and several hundred other patterns, and `--fix` applies the
safe ones. Running both in one pass keeps the diff small and reviewable.

## Choosing a rule set

```toml
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]
```

`E` and `F` are the classic style and error checks. `I` sorts imports. `UP` rewrites code for the version
you target. `B` catches likely bugs such as a mutable default argument. `SIM` points out a simpler
equivalent. Turning everything on at once produces hundreds of complaints, so pick a set, clear it, and
add rules as the code settles.

## The other class of mistake

```bash
python -m pip install mypy
mypy src
```

```toml
[tool.mypy]
strict = true
files = ["src"]
```

A type checker reads your annotations and the standard library stubs and reports calls that cannot work.
It finds a misspelled attribute, a `None` that gets dereferenced, a branch that returns nothing, and an
argument of the wrong type. `strict = true` enables the checks that matter, and
`disallow_untyped_defs` turns a missing annotation into an error rather than a silent gap.

Annotate the boundaries first, where data arrives from a file, a request or a command line. Those are
where a type error is most likely and most expensive to find in production.

## Hooking it into the commit

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

```bash
python -m pip install pre-commit
pre-commit install
```

A hook runs the tools over the files in the commit, so formatting never reaches review. Run the same
commands in continuous integration, because `git commit --no-verify` exists and someone will use it.

## Check yourself

Run `ruff check` on a project you already have and read every rule it reports. Fix the ones you agree
with, disable the ones you do not, and note which single rule produced the most noise.
