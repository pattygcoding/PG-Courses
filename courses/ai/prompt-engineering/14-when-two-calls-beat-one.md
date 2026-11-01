---
title: When two calls beat one
summary: The cost of a split, and the four cases that repay it.
chapter: Decomposition
minutes: 11
status: draft
---

## The accounting

Every split costs an extra call, and the input is usually sent twice because the second call needs the first
result. Latency grows, the bill grows, and there is a new failure mode in the handover.

Four cases repay that, and each repays it for the same reason: the second call could not have been done well
by the first.

## The four cases

- A decision that deserves review, which is the plan split from the earlier lesson.
- Different output shapes, which one schema cannot describe.
- A difference in the check, where one artefact is validated by a script and another by a person.
- A difference in the model, where a cheap model does the extraction and an expensive one does the reasoning.

The last is worth naming, because it is the split people forget and often the largest saving.

## When one call is right

Where the artefact is small, the shape is single and the decision is trivial. Pulling three fields out of a
document is one call, and splitting it adds a handover for nothing.

The test is whether the second call uses anything the first one decided. If the answer is no, there is one
task.

## The handover is a new failure

A split introduces a place for the two halves to disagree. That cost shows up in practice because it is
invisible in the prompt and appears only in the output. The previous lesson's consistency check is what makes
a split safe, and it is not optional.

## Check yourself

Take a two-call pair you use and write the costs beside the four cases above. Then decide whether the split
stays, and what one check would catch the halves disagreeing.
