---
title: Pretraining
summary: Next-token prediction over a large corpus, and what that alone produces.
chapter: Training
minutes: 12
status: draft
---

## The task

Pretraining is next-token prediction over an enormous amount of text. The loss is the model's surprise at
the token that actually came next, averaged over the batch, so everything the model knows was learned by
being less surprised.

That one task produces a model that completes text. It does not produce a model that follows instructions,
because nothing in the objective says the text after a question is an answer.

## What the corpus decides

The corpus is the ceiling on what the model can know. Code, documentation, books, forums and the public web,
filtered and deduplicated, in proportions the trainer chooses. A language that was one percent of the
corpus is a language the model handles at one percent of the fluency.

That is why a framework released after the training cutoff is missing even when it is famous, and why the
answer to a question about it reads like the previous release. The model is not being lazy. The tokens
describing the new version were never in the loss.

## Scale, in the right order

Three quantities grew together in the models that worked: parameters, data and compute. Scaling laws describe
the relationship, and the practical point is that they trade against each other rather than ranking. A model
trained on more tokens at a smaller size can beat a larger model trained on fewer.

That is why a current small model can outperform a much older large one, and it is why a release date tells
you more about a model than its parameter count does.

## What pretraining leaves out

Three things the task does not teach, each of which becomes somebody's job later.

- Following an instruction, since the objective rewards any plausible continuation.
- Knowing when to stop, since the loss has no notion of a finished answer.
- Refusing, since nothing in the corpus marks a request as one to decline.

The next four lessons cover how each of those is added.

## Check yourself

Write down one library or API you use that is recent enough to be absent from a training set. Predict how a
model will answer a question about it, then put the question to a model and compare the answer with your
prediction.
