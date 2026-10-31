---
title: The REPL and the standard library docs
summary: The fastest way to answer a question about Python is to ask an interpreter, then read the docs for the reasoning.
chapter: Getting started
minutes: 9
status: draft
---

## Use the interpreter as a scratchpad

```bash
python3
```

That drops you into the read-eval-print loop. It evaluates one statement at a time and prints the
result, which makes it the quickest way to check what a method returns, what a slice does, or
whether an error message means what you think. Nothing you do there is saved, so there is no cost
to experimenting.

```pycon
>>> "abc".removeprefix("a")
'bc'
>>> [1, 2, 3][::-1]
[3, 2, 1]
>>> 0.1 + 0.2
0.30000000000000004
```

## Ask an object what it can do

```pycon
>>> help(str.removeprefix)
>>> [name for name in dir(str) if not name.startswith("_")]
```

`dir()` lists the attributes, and filtering the underscores leaves the public ones. `help()` prints
the docstring, which for the standard library is the same text as the reference page.

## Read the documentation for the why

The reference at [docs.python.org](https://docs.python.org/3/) is written by the people who made
the decision. It is worth reading the paragraph after each signature, because that is where
guarantees and exceptions to them live: what raises, what is thread safe, and what changed in which
version.

## Check yourself

In the REPL, find the method that splits a string on whitespace, and read its docstring. Then check
the docs page for that method to see what it promises.
