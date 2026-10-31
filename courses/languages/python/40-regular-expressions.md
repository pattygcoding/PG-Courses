---
title: Regular expressions
summary: The subset worth remembering, named groups for readable code, and the cases where a regex is the wrong tool.
chapter: Data
minutes: 14
status: draft
---

## Compile once, then ask a question

```python
import re

ORDER = re.compile(r"order #(?P<number>\d+)")

match = ORDER.search("shipped order #4471 today")
if match:
    print(match.group("number"))
    print(match.groupdict())
```

```text
4471
{'number': '4471'}
```

`search` finds the first match anywhere, `match` only at the start of the string, and `fullmatch`
requires the whole string. `findall` returns strings while `finditer` returns match objects with
positions, which is what you need for highlighting. Compiling once outside a loop avoids rebuilding
the pattern on every call.

## The pieces that do most of the work

| Pattern          | Matches                                                    |
| ---------------- | ---------------------------------------------------------- |
| `.`              | any character except a newline                             |
| `\d` `\w` `\s`   | a digit, a word character, whitespace                      |
| `[abc]` `[^abc]` | one of, or none of, a set                                  |
| `*` `+` `?`      | zero or more, one or more, optional, greedy                |
| `*?` `+?`        | the same, preferring the shortest match                    |
| `^` `$`          | start and end of the string, or of a line with `MULTILINE` |
| `{2,4}`          | between two and four repetitions                           |
| `(?P<name>...)`  | a capturing group with a name                              |
| `(?:...)`        | a group that does not capture                              |

Greedy quantifiers take as much as they can and then give characters back, which is why `.*?` shows up
inside tag patterns. `\.` matches a literal dot, and a raw string keeps Python from reading the
backslash first.

## Substitution driven by a function

```python
import re

PRICE = re.compile(r"\$(?P<amount>\d+)\.(?P<cents>\d{2})")


def half(match: re.Match[str]) -> str:
    total = int(match.group("amount")) * 100 + int(match.group("cents"))
    return f"${total // 2 / 100:.2f}"


print(PRICE.sub(half, "list price $19.99"))
```

```text
list price $9.99
```

The replacement receives each match, which is what you need when the new text depends on the numbers in
the old one. `subn` does the same and reports how many replacements happened.

## When a regex is the wrong tool

- Splitting a well formed format: `csv.reader` understands quoting and a pattern does not.
- Reading JSON, XML or HTML: use `json`, `xml.etree` or an HTML parser.
- Matching a fixed string: `in`, `startswith` and `endswith` are clearer and faster.
- Validating an email address to the letter: the grammar is longer than the problem, and sending a
  confirmation message is the actual test.

The rule worth keeping: a pattern describes text and a parser describes structure. When the pattern
needs a state machine to explain, write the state machine.

## Check yourself

Extract every `HH:MM` timestamp from a log line with one pattern and named groups. Then take a pattern
you have already added a third alternation to, and replace it with a small function that returns an
enum or `None`.
