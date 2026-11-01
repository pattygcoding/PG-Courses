---
title: Delimiters
summary: Marking where the input starts so instructions and data are not confused.
chapter: Examples and delimiters
minutes: 12
status: draft
---

## The problem

Input that contains instruction-shaped text is read as an instruction. A diff contains comments, and a
comment can read like a rule. A commit message can read like a request. Once instructions and data are the
same kind of text, nothing in the prompt separates them.

A delimiter is the cheapest fix: a marker saying where the data begins and ends.

## What to use

Three families, in increasing strictness.

- A labelled line, as in `Diff:` above the input.
- Fencing, as in three backticks around the input.
- An explicit sentinel, such as a line of dashes or a tag, when the input may itself contain fences.

The migration prompt uses a label. The review prompt uses a label and a heading. Fencing suits code and
markdown, because the content is then shown in the shape it already has.

## An input containing your own delimiter

The failure worth guarding against is input holding your own marker. A diff of a file that contains three
backticks breaks a fence, and the fix is a sentinel the input cannot plausibly hold, or an explicit line
saying that everything after the label is data.

## The label does a second job

A label also marks the end of the input, which matters when the input is long. Without one, a trailing
instruction is ambiguous: it could be part of the data.

```text
Diff:
{{diff}}
```

That is the whole change in most prompts, and it costs a line.

## Check yourself

Take a prompt whose input is code and wrap the input in a labelled, fenced block. Then send a file that
contains three backticks and see whether the answer still treats it as data.
