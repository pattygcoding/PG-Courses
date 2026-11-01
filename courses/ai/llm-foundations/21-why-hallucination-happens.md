---
title: Why hallucination happens
summary: The same mechanism that produces a right answer, with nothing checking it.
chapter: Failure
minutes: 12
status: draft
---

## The mechanism is not broken

Hallucination is not a fault that appears when something goes wrong. It is the ordinary operation of a
next-token predictor applied to a question whose answer it does not have. The model produces the continuation
that fits, and a fluent, plausible, invented answer fits.

Look back at the distribution from the generation chapter. Nothing in it is a fact. It is a ranking of what
usually comes next, and a confident sentence and a false one are produced the same way.

## Where the tokens come from

For a question about a well-documented thing, the training text holds many answers and the model lands on one
of them. For a question about your schema, your ticket, or a library released last month, the training text
holds nothing, and the model still has to produce the shape of an answer.

The failure is not that the model refuses. The shape of an answer is itself a strong pattern, and the model
completes it with invented content rather than breaking it.

## Four situations it shows up in

- A named entity that does not exist, where the name was assembled from parts that do.
- A citation, a version number or a commit hash, where the format is known and the value is not.
- An API call with an argument that was never in any release, though the call looks like every other call.
- A summary of a document the model never read, which reads exactly like a summary of one it did.

## Why programming meets it often

Three reasons specific to code, and they are worth holding together.

- Identifiers are arbitrary rather than descriptive, so a name cannot be inferred from what it means.
- The library surface is large and mostly unwritten about, so much of it was never in the corpus.
- A wrong name fails the same way whether it was plausible or not, so the mistake costs a build rather than a
  minute.

## Check yourself

Write down a question whose answer the model cannot have, such as something about your own repository. Ask it,
then describe the answer: its length, how confident it reads, and whether it names anything you can check.
