---
title: The fact that was never in the model
summary: Where no wording helps, and what to send instead.
chapter: What a prompt cannot fix
minutes: 12
status: draft
---

## The boundary

A prompt specifies a task. It cannot supply a fact the model does not have, and no rewording changes that. When
output is wrong about the content of your system rather than about the shape of the answer, the prompt is not
the tool.

Two symptoms identify the boundary. The answer is fluent and describes something that does not exist in your
repository. And the failures do not move as rules accumulate.

## What to do instead

- Attach the file, so the answer is grounded in the thing itself.
- Retrieve the relevant passages, which is a course of its own in this section.
- Move the fact into the check, so a wrong answer is caught rather than requested against.

The first is cheapest and covers most cases. The second is for a corpus too large to attach. The third is for a
fact that has to be right rather than merely present.

## The prompt line that does help

One line earns its place even here: say what the input is and that it is authoritative.

```text
The schema below is the current one. Use only the tables and columns it names.
```

That is not teaching a fact. It tells the model which of two sources to prefer, which is specification work,
and it is the difference between an attachment being used and being ignored.

## The test that separates the two

Take a failing case and remove the attachment. If the answer is wrong in the same way with and without it, the
prompt and the attachment are both the wrong places to look. If the answer is right with it and wrong without
it, the prompt was never the problem.

## Check yourself

Take a prompt that produces answers wrong about your own system and run one case with the relevant file
attached and once without. Write down whether the difference lies in the prompt or in what you send.
