---
title: What fine-tuning does not change
summary: The boundaries of the later training, stated plainly.
chapter: Training
minutes: 12
status: draft
---

## Four things that survive

The stages after pretraining change manner and form. Four properties of the base model come through all of
them, and knowing which ones saves wasted effort.

## The knowledge cutoff

A fine-tune on your own examples does not teach a model about a library released after the base model was
trained, unless your examples carry the documentation. The model learns the shape you demonstrated and
brings its old beliefs to the content.

Retrieval is the tool for this, and it has its own course in this section.

## The context window

The window is part of the architecture, so continuing to train does not widen it. A model that held eight
thousand tokens holds eight thousand after your fine-tune, because the position scheme was built for that
range.

## The tokeniser

The vocabulary is fixed before pretraining and stays fixed. A fine-tune cannot make your domain's identifiers
cheaper, so a token count measured before a fine-tune is still the right estimate afterwards.

## The tendency to be fluent

Confidence in a wrong answer comes from pretraining and is reinforced by a manner tuned to be helpful.
Fine-tuning on your data can make it worse rather than better, because every example in your dataset is an
answer rather than an admission.

Where you need a model that says it does not know, the place to work is the prompt and the checks around it.

## Three questions before paying for training

- Is the gap a form or a fact?
- Would a paragraph of instruction and three examples close it?
- Can I measure the difference on cases the model has not seen?

Where the answers point at a form, fine-tuning is the right tool. Where they point at facts or at confidence,
the fix belongs in the context you send and the checks you run.

## Check yourself

Write down one thing you had assumed a fine-tune would fix. Then place it against the four properties above
and say which applies, and what you would do instead.
