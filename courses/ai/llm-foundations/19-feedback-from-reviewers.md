---
title: Feedback from reviewers
summary: Preferred answers, reward models, and the step that makes a model pleasant to use.
chapter: Training
minutes: 12
status: draft
---

## The problem with imitation

Instruction tuning imitates the examples it was given, so its ceiling is the quality of those examples, and
it says nothing about which of two plausible answers is better. A preference is easier to collect than a
perfect answer, and it is what the last training step uses.

## The two stages

A common recipe has two parts. A reward model is trained on pairs, where a person read two responses and
said which they preferred. The policy is then tuned to produce responses that reward model scores highly,
with a constraint that keeps it from drifting too far from where it started.

That constraint is the part worth knowing about. Without it the model learns to exploit the reward model
rather than to be helpful, because a learned scorer is a proxy and a proxy can be gamed.

## What preference training changes

The visible effects are about manner and caution rather than knowledge.

- It answers rather than continues.
- It declines some requests, which refusal examples alone did not reliably produce.
- It follows the shape of an instruction more closely, including constraints such as a word limit.
- It hedges less on ordinary questions and more on ones it cannot answer, though not reliably.

## Why it is worth knowing

Three consequences reach the application. A model's manner is a product decision rather than a property of
the data alone, which is why two models with similar scores feel different to use. The preference data
reflects the annotators, so a tone that reads as neutral to one audience reads as strange to another. And
the reward model is a proxy, which is why an unusual prompt can produce an answer that scores well and reads
badly.

## Check yourself

Write two answers to one of your own questions, the one you would prefer and the one a colleague might
prefer. Then write down what a preference dataset would have to say to produce the second rather than the
first, and whether that is a fact about the answer or about the audience.
