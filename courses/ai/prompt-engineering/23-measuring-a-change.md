---
title: Measuring a change
summary: The pass rate, and the difference it showed between two prompt versions.
chapter: Iteration
minutes: 13
status: draft
---

## Why a rate rather than an impression

The last output you saw is what you remember, and it is one sample. Nine cases across two versions give a
number, and the number is what says whether a rewrite helped.

The full report from the case runner in this course:

```text
pass rate
  Description to migration           0/3   3/3
  Diff review against a rules list   1/3   3/3
  Commits to a changelog entry       0/3   2/3
  all cases                          1/9   8/9
```

## What the columns are

The two columns are two versions of the same three prompts. The first is a sentence and the input. The second
adds the rules, the output shape and one example, which is the material from the first two chapters.

One case in nine passed before and eight in nine passed after. That is the answer to the question the rewrite
was asked to answer, and building the set took an afternoon.

## What the rate is not

It is not a measure of the prompts in general and it is not comparable across projects. The cases were chosen
to cover this work, so the number is meaningful for changes to these prompts and for nothing else.

What generalises is the shape: a fixed set of cases, two versions, one rate per version. Where the cases are
yours and the inputs are realistic, the number is trustworthy for decisions about the thing being measured.

## Reading the failures

The rate is the summary. The failures are the work, and each line names a case and a reason:

```text
  FAIL  a query with no bound
          $.findings[0].rule: expected one of R1, R2, R3, got "UNBOUNDED_QUERY"
```

That reason says the model invented an identifier rather than missing a rule, which points at the rule list
rather than at the instruction to review. A rate without the reasons would have sent someone to rewrite the
whole prompt.

## Running it where it can fail

A suite nobody runs drifts. Two placements work: run it when a prompt file changes, and run it on a schedule so
that a model upgrade from the provider appears as a change in the number rather than as a bug report.

## Check yourself

Build a set of five cases for one prompt, run two versions of it, and record both rates. Then read the failures
from the lower version and write the single change they point at.
