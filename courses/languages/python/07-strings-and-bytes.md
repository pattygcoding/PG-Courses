---
title: Strings and the str/bytes split
summary: Text and raw bytes are different types, and the encoding is the decision that joins them.
chapter: Language basics
minutes: 13
status: draft
---

## Two types, two jobs

`str` holds text as Unicode code points. `bytes` holds raw bytes as integers from 0 to 255. A file
or a socket gives you bytes, because the machine has no idea what they mean. Turning bytes into
text is your decision, and it needs an encoding name.

```pycon
>>> text = "café"
>>> data = text.encode("utf-8")
>>> data
b'caf\xc3\xa9'
>>> data.decode("utf-8")
'café'
```

## One string, three lengths

```pycon
>>> len("café"), len("café".encode("utf-8")), len("café".encode("utf-16-le"))
(4, 5, 8)
```

A code point count, then two different byte counts. That is why `len` on a string does not tell you
how much storage it needs, and why a database column sized in bytes can reject text that looked
short in Python.

## The methods you will use most

```pycon
>>> s = "  Hello, World  "
>>> s.strip()
'Hello, World'
>>> s.strip().lower().replace("world", "there")
'hello, there'
>>> "a,b,,c".split(",")
['a', 'b', '', 'c']
>>> "line".center(10, ".")
'...line...'
```

Strings are immutable, so every method returns a new string and the original is untouched.
`split` keeps empty fields, which is right for machine-generated data and often wrong for typed
input.

## Prefixes, membership and joining

```pycon
>>> "ell" in "hello"
True
>>> "hello".startswith(("hi", "hello"))
True
>>> ", ".join(["a", "b", "c"])
'a, b, c'
```

Build long text with `join` instead of `+=` inside a loop, because `join` measures once and
allocates once.

## Check yourself

Decode `b'caf\xc3\xa9'` as `utf-8` and then as `latin-1`. Explain both results.
