---
title: Greedy and repeatable output
summary: Taking the best token every time, and when that is what you want.
chapter: Generation
minutes: 12
status: draft
---

## The shortest decoding rule

Greedy decoding takes the highest logit at every step and nothing else. There is no draw, so the same input
gives the same output every time.

```text
greedy, temperature 0:
  the librarian renewed the loan for the reader . the librarian renewed the loan for the
```

Read that against the sampled runs in the previous lesson. Greedy follows the most likely path, which here
is a two-sentence cycle the model can walk for as long as you let it. Determinism did not make the answer
better.

## Why greedy loops

The model has no notion of having said something already. At each step it looks at a short context and takes
the most likely continuation, and once the context repeats, the continuation repeats with it. In a small
model over a repeating corpus that is obvious. In a large model the same tendency appears as a paragraph
that circles back to a phrase it has already used.

Beam search mitigates part of this by carrying several candidate sequences at once, and it is used where the
output is short and the score is the point. For chat and for code it has largely been left to sampling.

## What greedy is good for

Three cases, and they are the ones where you want a decision rather than a distribution.

- Extraction, where the answer is a value in a known format.
- Classification, where the answer is one of a fixed set of labels and it fits in one token.
- Evaluation, where a number has to reproduce and any randomness makes it meaningless.

In all three, part of the point is that two runs agree. A test asserting on a sampled response needs a fixed
seed, and the seed is a provider detail rather than part of your interface.

## Repeatability in practice

Two routes. Set the temperature to zero, which depends on the provider treating zero as greedy. Or keep the
temperature and fix the seed, which several providers accept and which gives you sampling that repeats.

Either way, repeatability belongs to a provider and a version. A model upgrade changes the weights and the
answers with them, so a test that asserts an exact string is a test that breaks on someone else's release
schedule.

## Check yourself

Write one prompt whose answer you can check mechanically and run it three times at temperature zero, then
three times at temperature one. Say which of the two is usable in a test, and what you would assert instead
of the exact text.
