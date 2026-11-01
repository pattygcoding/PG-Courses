---
title: The smaller task
summary: Cutting the job until the model can do it.
chapter: What a prompt cannot fix
minutes: 12
status: draft
---

## When the answer is too much

Some tasks fail because the whole job is beyond the model at this size, and no wording helps. The output is
plausible and partly wrong, and the wrong parts move between runs.

The fix is not a better prompt but a smaller job, and the decomposition chapter is where the technique lives.

## Cutting until it works

Three cuts, in order of how much they give back.

- Cut the output. One artefact rather than three, which is the one task per call rule.
- Cut the input. A function rather than a file, a file rather than a repository.
- Cut the reasoning. Take the decision out of the call and make it an input, which is the plan split.

Each cut costs a call and buys accuracy. The third buys the most, because decisions are where the model is
least reliable.

## The measurement that says which cut

A case set says which cut to make, because it shows which cases fail. Failures spread across every case point
at the input being too large. Failures concentrated in the cases with a twist point at the reasoning.

One case failing while the rest pass is not a size problem. That is the residual failure, and cutting will not
fix it.

## The honest limit

There is a size below which a task is not worth splitting: three calls to extract one field is a system nobody
maintains. At that point the answer is a larger model or a different approach, and saying so is part of the
work rather than a failure.

## Check yourself

Take a task that fails unpredictably and apply the three cuts in order, measuring after each. Write down which
cut moved the rate, and where you would stop.
