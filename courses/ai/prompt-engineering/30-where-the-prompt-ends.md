---
title: Where the prompt ends
summary: Four things to reach for when wording has stopped helping.
chapter: What a prompt cannot fix
minutes: 12
status: draft
---

## The four exits

Every problem in this chapter has the same shape: wording has stopped helping and the answer is outside the
prompt. Four destinations, and the signal for each.

- An attachment, when the answer is a fact about your own system.
- Retrieval, when the fact is one of thousands and they cannot all be attached.
- A tool call, when the value has to be computed or fetched.
- A check in code, when the requirement is mechanical and the model keeps missing it.

## The signals

Each exit has a symptom you can recognise in the report.

```text
pass rate
  Description to migration           0/3   3/3
  Diff review against a rules list   1/3   3/3
  Commits to a changelog entry       0/3   2/3
  all cases                          1/9   8/9
```

A rate that moved with the wording says the prompt was the problem. A rate that held still across three
rewrites says one of the four exits is the answer, and the failures name which.

## The shape of a finished set

A finished case set has three properties, and none of them is a perfect score. Every case that represents a
requirement passes. Every failure has a recorded reason. And every requirement the prompt could not hold has
been moved to a check, an attachment or a tool, with the case kept as the evidence for the move.

## The habit that outlasts the tooling

One habit covers the whole course. When output is wrong, decide first whether the fault is in the
specification, in the input, or in the model's ability, and only then change something. That question takes a
minute and it is the difference between iterating and churning.

## Check yourself

Take a prompt you have rewritten more than twice and read its failing cases. Decide which of the four exits each
failure points at, then move one of them out of the prompt and record the case as the reason for the move.
