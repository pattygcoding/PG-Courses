---
title: The cases that pin a behaviour
summary: Three cases per prompt, and how to choose them.
chapter: Iteration
minutes: 12
status: draft
---

## What a case is

A case is an input, the response recorded for it, and the check that decides whether the response is
acceptable. Three parts, and the third does the work.

The check is what stops a case being a snapshot. A snapshot fails whenever the wording changes. A check asserts
a property and survives a rewording that keeps the property true.

## Three is usually enough

Each prompt in the suite has three cases, chosen to cover three different jobs.

- The common case, which has to keep working.
- The case with a twist, such as an operation whose reversal is not the obvious one.
- The empty case, where the correct answer is nothing to report.

The third matters most, because it is the case a prompt breaks first. Both versions of the review prompt
handled it, which is why the vague version scored one out of three rather than zero:

```text
  pass  a diff that breaks no rule
```

## Choosing the twist

The twist is what found the real bug in this suite. The migration case asks for an index, and the vague prompt
produced a `down` that dropped the column instead of the index:

```text
  FAIL  an index on an existing column
          down does not mention DROP INDEX
          down wrongly mentions DROP COLUMN
```

That case was chosen because reversing an index is where the obvious answer is wrong. A case picked for being
representative would have been another column.

## Where the cases come from

Two sources, and both are sound. A real input you have already sent, recorded with the response it produced.
And an input constructed for the case, which is how the twist above was chosen.

The second is what makes a set useful, because the inputs you happened to send are rarely the ones that break a
prompt.

## Check yourself

Write three cases for one of your prompts: the common case, a twist where the obvious answer is wrong, and the
empty case. Then write each check as a sentence, and see whether any of the three is a snapshot of the wording
rather than a property.
