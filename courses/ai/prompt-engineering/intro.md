---
title: Prompt engineering
level: Beginner
summary: Write instructions a model follows, covering constraints, examples, output shapes and how to tell when a prompt is broken.
labels:
  - AI
  - Prompting
  - Practice
minutes: 20
status: draft
---

## What this course is

A prompt is a specification, and most bad output is a bad specification. The model cannot ask you a
clarifying question, so every ambiguity you leave becomes a guess: which language, which style, which
edge case matters, what the answer looks like when it arrives.

This course is about the instruction itself. State the job and the constraints. Show one example of
the shape you want. Ask for a single output format and validate it. Split a task that asks for too
much at once. Change one thing per revision, and keep the prompt in the repository so a change can be
attributed rather than guessed at.

## Who it is for

You use a model for real work and the results vary more than you would like. No machine learning
background is needed, and nothing here depends on one particular product.

## What you will build

A small library of prompts that earn their place, kept beside the code that calls them: one that turns
a description into a database migration, one that reviews a diff against a list of rules, and one that
writes a changelog entry from a set of commits.

Each prompt ships with three cases it has to handle, so a change to the wording is checked instead of
judged by whichever output you saw last.

## Prerequisites

A model you can send prompts to, and a small repository to point it at. Nothing else.

## How the pages are ordered

The first chapter is the shape of an instruction: the job, the constraints, the output format, and the
order that keeps them from competing. The second is examples and delimiters, covering few-shot
prompting and why one good example often beats a paragraph of rules.

The third is decomposition: tasks that need a plan before an answer, and the ones that should be two
calls rather than one. The fourth is structure, covering JSON output, schema validation, and what to
do when the model returns prose anyway.

The fifth is iteration: prompts under version control, the cases that pin a behaviour, and measuring a
change rather than trusting an impression. The last chapter is what a prompt cannot fix, which sends
the problem to retrieval, to a tool call, or to a smaller task.

Read them in order the first time, following the contents list on this page. Each chapter ends with a
prompt you can run against your own repository.
