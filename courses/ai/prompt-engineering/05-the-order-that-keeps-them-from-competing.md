---
title: The order that keeps them from competing
summary: Job, rules, format, example, input. And why the input goes last.
chapter: The shape of an instruction
minutes: 12
status: draft
---

## The order

A workable order for an instruction, and the one this course's prompts use:

```text
1  the job
2  the rules
3  the output format
4  one example
5  the input, under a label
```

Each part earns its place, and the input goes last because everything after it competes with it for
attention.

## Why the input goes last

A model reads the whole prompt, and material placed after the input is read while the input is still
recent. Instructions placed after the input behave differently from instructions placed before it, and the
effect is strong enough that long inputs are usually wrapped and labelled.

The label matters as much as the position. `Description:`, `Diff:` and `Commits:` tell the model where the
data starts and ends, which is the delimiter topic in the next chapter.

## What moves to the end

Two things belong after the input, and only two. A restatement of the format, where the input is long enough
that the format has scrolled out of mind. And a final line such as "answer with the JSON object only", which
behaves as a reminder rather than as new information.

Everything else belongs before. A rule read while the input is being read is a rule applied to whatever
assumption the model already formed.

## Version 2 of the changelog prompt

The whole thing, in that order:

```text
Write a changelog from the commits below.

Rules:
- Return one JSON object and nothing else.
- One entry per commit, and no entry for a commit that is not listed.
- Use the short hash exactly as given.
- Say when a commit changes only documentation.

Shape: {"entries": [{"commit": "a1b2c3d", "text": "..."}]}

Commits:
{{commits}}
```

Job, rules, shape, then the label and the input. That prompt passed two of its three cases where the version
without any of it passed none.

## Check yourself

Take a prompt of yours and sort it into the five parts. Move the input to the end if it is not already there,
change nothing else, and compare the two versions on one input.
