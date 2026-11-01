---
title: One example
summary: Why a single demonstration beats a paragraph of rules.
chapter: Examples and delimiters
minutes: 12
status: draft
---

## What an example carries

An example shows the format, the register and the level of detail at once. A paragraph of rules describing
those three things is longer and still ambiguous, because prose about a shape is a description of a shape
rather than the shape.

The migration prompt's example:

```text
Example, for "add a column books.isbn of type text":
{"up": "ALTER TABLE books ADD COLUMN isbn text;",
 "down": "ALTER TABLE books DROP COLUMN isbn;", "notes": []}
```

Six lines fixing the key names, the statement style, the fact that `notes` is present and empty when there is
nothing to say, and the level of detail in the SQL.

## Example against rules

The same instruction written as rules alone needs a line for each of those four properties and a fifth to
say that `notes` may be empty. The example costs one line per property and cannot be misread.

That is why each prompt in the suite carries one, and why the difference between the two versions is mostly
the example plus the format line.

## How many

One is usually enough for a shape. Two or three help where the task has genuinely different categories, such
as a changelog entry for a feature and one for a documentation change. Past three the examples overlap and
the prompt grows without adding information.

Where cases differ in kind rather than in detail, three labelled examples beat ten unlabelled ones, because
the label is what tells the model which example applies.

## Where an example does not belong

An example of the *input* is not an example of the output. A prompt demonstrating a good commit message for
one repository has taught the model about that repository. The example has to demonstrate the shape of the
answer, and the input beside it has to be short enough not to be mistaken for data.

## Check yourself

Take a prompt with a paragraph of rules about the output and replace the paragraph with one worked example.
Run both on the same input and note which properties of the answer the example fixed that the rules left
open.
