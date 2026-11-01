---
title: Instruction tuning
summary: Supervised examples of answers, which is what turns a completion into a response.
chapter: Training
minutes: 12
status: draft
---

## The gap it closes

A pretrained model continues text. Ask it a question and it may continue with more questions, because a
page of questions looks like that. Instruction tuning teaches the shape of an answer.

Thousands to millions of pairs, each a prompt and a desired response, and the same next-token loss applied
to the response with the prompt's tokens masked out. Writing the pairs is the work, and the training is the
easy part.

## What the examples teach

Four things, and the first is the one people underrate.

- Format. A question is followed by an answer rather than by another question.
- Register. A tone, a level of detail, an amount of hedging.
- Refusal. Examples where the desired response declines a harmful request.
- Tool use, where the model is meant to call functions, since the call's format is a convention rather than
  something a model would invent.

The data decides the manner as much as the content, which is why models from different labs feel different
to use at similar capability.

## Why the model still cannot know your system

The examples were written by people about the world rather than about your repository. Nothing in instruction
tuning reads your code, so a model answering a question about `src/loans.ts` is guessing or reading the file
you attached.

## The cost of a manner

The register has a price worth naming. A model tuned to be helpful and confident produces confident answers
to questions it cannot answer, because examples of a fluent response vastly outnumber examples of "I do not
know" in the data.

Confronting that is the failure chapter, and the fix lives at the application layer rather than in the
weights.

## Check yourself

Write two prompt and response pairs for a task you do often, in the format you would want the model to
follow. Then say which of the two would be hard to write a hundred times consistently, and why.
