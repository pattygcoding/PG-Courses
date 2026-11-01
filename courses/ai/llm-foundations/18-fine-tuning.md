---
title: Fine-tuning
summary: Training the weights further, and the short list of jobs worth it.
chapter: Training
minutes: 13
status: draft
---

## What it is

Fine-tuning continues training on your own examples. The machinery matches instruction tuning at a smaller
scale: a dataset of pairs, a few epochs, and a learning rate low enough that the model does not forget what
it knew.

Parameter-efficient methods make it cheaper by training a small set of added weights rather than the whole
model. For most purposes the result behaves similarly, and the artefacts are megabytes rather than
gigabytes.

## What it changes well

Four jobs repay the effort, and they share a property: the behaviour wanted is a consistent form rather than
a piece of knowledge.

- Output format. A model that always emits your JSON shape with your field names.
- Classification. Sorting a request into your categories, where the labels are yours.
- Tone. A house voice, which examples define better than a paragraph of instruction manages to.
- A short, well-defined transformation, one that holds across thousands of inputs and is awkward to
  describe.

## What it changes poorly

Facts, and this is the expensive misunderstanding. A fine-tune teaches a form, and a fact needed at answer
time belongs in the prompt or in a store you retrieve from. Putting a hundred documents into a fine-tune
dataset is a slow way to make a model slightly more likely to answer from them, and it fails in the way that
matters.

Prompting is also cheaper than fine-tuning for anything describable in a paragraph, which is most things.
Reach for fine-tuning when the behaviour is consistent, measurable and repeated thousands of times, so the
per-call saving repays the setup.

## The evaluation you owe yourself

A fine-tune needs a held-out set and a metric before it starts, because a model that has learned your format
can still be worse at the task. Two runs are worth comparing: the tuned model, and the base model with a good
prompt, over the same cases. Without that comparison the change cannot be justified either way.

## Check yourself

Take one task you repeat often and say whether its difficulty is format or knowledge. Then write what a
held-out set of twenty cases would have to contain for the comparison above to mean anything.
