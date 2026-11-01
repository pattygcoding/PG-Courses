---
title: Confident and wrong
summary: Fluency and certainty are separate from accuracy, and the training rewards the first two.
chapter: Failure
minutes: 12
status: draft
---

## The signal you are reading

When a person is unsure, you hear it in the hedging. When a model is unsure, the hedge may be missing, because
hedging is a manner rather than a report on the model's internal state.

There is no field for "I am guessing". Whatever probabilities sat behind the answer, what reaches you is one
sample from them, written in the register the model was tuned to use.

## Where the confidence comes from

Three sources, and none of them tracks correctness.

- Instruction tuning, where the examples are answers rather than admissions of ignorance.
- Preference training, where a fluent response is usually preferred to a hedged one.
- The decoding, where a low temperature turns a modest preference into a definite statement.

The third is the one you control directly. At temperature zero the model commits to the highest-probability
token at every step, which is a decision to speak without the variation a lower sample would have shown.

## What fluency does and does not signal

Fluency signals familiarity with the form of the text and nothing about its content. A generated paragraph
about a fictional API is as smooth as one about a real API, because the smoothness comes from the shape of the
prose rather than from the subject.

That is why the check matters more than the read. Reading a fluent paragraph produces the feeling of
understanding, and the feeling is not evidence.

## Hedges as a weak signal

A hedge is not proof of ignorance and its absence is not proof of knowledge. Two heuristics still hold. A hedge
is worth taking seriously, because it often comes from the model having seen contradictory text. And a very
specific claim, such as a version number or an exact filename, deserves checking however it is phrased.

## Check yourself

Take three answers you have accepted recently and find the one that reads most confidently. Identify the single
most checkable claim in it, a name or a number, and check that claim. Record whether it held.
