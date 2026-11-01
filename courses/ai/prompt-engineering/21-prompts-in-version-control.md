---
title: Prompts in version control
summary: The prompt is a file, and the diff is the record of what changed.
chapter: Iteration
minutes: 12
status: draft
---

## The prompt as an artefact

A prompt pasted into a chat has no history. A prompt in the repository has a diff, a review and a blame, so
the question of why a line is there has an answer.

That is the argument for keeping them as files, and it costs one directory.

## Where they live

Three placements work, and the choice depends on how many callers there are.

- Beside the code that calls them, when there is one caller and the prompt is short.
- A `prompts` directory, when several call sites share them.
- A directory per job, with the cases beside the prompt, which is what the suite for this course does.

The third is worth copying at any size, because the cases are part of the prompt rather than a separate
concern, and a change to one usually needs a change to the other.

## What belongs in the file

The prompt text with its placeholders. The output schema. The cases. And a line recording which model the
cases were captured against, because a model change alters a prompt's behaviour even when the text is
identical.

That last line is the one left out, and it is the first question asked when a recorded case stops matching.

## Reviewing a prompt change

A prompt diff reads as prose, which makes it easy to approve without reading. The habit that helps is to read
it as a specification: which of the four parts changed, and what behaviour that changes. A change to the
format line is a change to every case. A change to a rule is a change to the cases that rule covers.

## Check yourself

Move one prompt you use into the repository with its schema and its cases, and record the model and version the
cases were captured against. Then make one change to the text and commit it separately from any code change.
