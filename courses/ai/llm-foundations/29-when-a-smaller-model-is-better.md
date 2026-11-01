---
title: When a smaller model is better
summary: Cheaper, faster, and sometimes better on a narrow task.
chapter: The economics of a call
minutes: 12
status: draft
---

## The trade

A smaller model costs less per token, starts faster, streams faster and needs less memory. It is worse at broad,
open work: reasoning across a long context, following a subtle instruction, writing code in a language with less
training data.

That is a trade with several axes rather than a ranking, and which side wins depends on the task.

## Where the small one wins

Three situations come up constantly.

- A narrow, well-specified transformation, such as pulling fields out of a document whose shape is fixed.
- A classification into your own labels, where a few examples in the prompt define the job.
- A high-volume path where latency is the product and the answer is short.

In each of those, the large model's advantage is largely wasted, because the task does not use the breadth.

## Where the large one wins

- Open-ended work, where the hard part is deciding what to do rather than doing it.
- Long context, where the whole repository has to be held at once.
- Anything unusual, where the training distribution does not cover your case and the extra capacity pays.

The second and third are the ones that feel most valuable, which is why the largest model is reached for by
default and paid for on work that did not need it.

## Testing the claim rather than assuming it

The comparison costs an afternoon. Build twenty cases with known answers, run both models, and score them. Two
outcomes are common and both are informative: the small model matches on the narrow task, or it fails on a
specific subset that turns out to be the part needing the large one.

A routing decision that comes out of that exercise, where a cheap model handles the common case and a larger one
handles the rest, is measurable rather than a matter of taste. It is also the point at which the bill stops being
a surprise.

## Check yourself

Pick one task you run often and build ten cases with known answers. Run them against a small model and a large
one, score both, and write down where the small one failed. Then say whether those failures justify the price
difference.
