---
title: Text encodings in practice
summary: Why UTF-8 everywhere, and what to do with a file you did not create that turns out not to be UTF-8.
chapter: Data
minutes: 12
status: draft
---

## Always name the encoding

```python
from pathlib import Path

text = Path("notes.txt").read_text(encoding="utf-8")
```

Without `encoding`, Python uses the platform default, which is UTF-8 on Linux and macOS and locale
dependent on Windows. That difference is how a file written on one machine fails to read on another,
so name it at every call.

## UTF-8 is the format worth standardising on

```pycon
>>> "café".encode("utf-8")
b'caf\xc3\xa9'
>>> "café".encode("utf-8").decode("utf-8")
'café'
>>> len("café".encode("utf-8"))
5
```

It represents every code point, matches ASCII for ASCII text, and is what the web, JSON and most
databases expect. A byte order mark is unnecessary, and writing one into a file that other software
reads is a regular source of confusion.

## When the bytes are not valid UTF-8

```pycon
>>> b"\xff\xfeh".decode("utf-8")
Traceback (most recent call last):
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xff in position 0: invalid start byte
```

Four approaches, in the order worth trying them:

1. Find the real encoding from whoever produced the file and decode with that name.
2. Detect it with `charset-normalizer` and treat the answer as a guess that a human should confirm.
3. Decode with `errors="replace"` to keep going while marking the bad bytes.
4. Decode with `errors="surrogateescape"` and re-encode with the same setting later, which round trips
   bytes you never needed to read.

```pycon
>>> b"\xff\xfeh".decode("utf-8", errors="replace")
'\ufffd\ufffdh'
```

Replacement loses information, so it suits a display path and not a data pipeline. `surrogateescape` is
the one to use when the job is to pass bytes through untouched.

## Text is not a byte string with an accent

```pycon
>>> text = "e\u0301"
>>> len(text), len(text.encode("utf-8"))
(2, 3)
>>> import unicodedata
>>> unicodedata.normalize("NFC", text) == "é"
True
```

One visible character can have more than one representation, so two strings that look identical can
compare unequal, and a unique index can accept both. Normalise to NFC at the boundary where text
arrives, then compare.

## Check yourself

Write the same accented text to two files, one in UTF-8 and one in cp1252, then read both back as
UTF-8 and record the failure. Then normalise a decomposed word and confirm it matches the composed
form.
