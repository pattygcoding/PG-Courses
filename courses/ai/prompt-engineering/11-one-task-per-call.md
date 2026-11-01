---
title: One task per call
summary: The instruction that asks for four things and gets three of them.
chapter: Decomposition
minutes: 11
status: draft
---

## The overloaded prompt

A prompt asking for a migration, a test, a changelog entry and a review asks for four things under one
specification. The format clause applies to the first, the rules to the fourth, and the example to none of
them. The model satisfies part of the request, and which part varies.

The symptom is a response that is competent and incomplete, with no way to say which of the four went
missing, because the output shape was defined for one of them.

## Why the failure is quiet

Asked for four things, a model produces something beginning with the first, and every part reads as a
finished answer. Nothing marks the third as absent. That is how an overloaded prompt survives in a codebase:
the first two thirds read well enough that nobody checks the rest.

## The test

One question decides whether a prompt carries one task. Does the output have a single shape? Where two
sections of the answer need different shapes, they are two calls.

Each prompt in the suite defines one shape and each check reads that one shape. A prompt returning both a
migration and a changelog could not be validated against a single schema.

## What is not overload

A task and its explanation are one task where the explanation is a field of the same shape, which is what
`notes` does in the migration prompt. The exception is a second *format*: a `notes` array of strings is a
field, and a paragraph of prose after the JSON is a second shape that does not fit.

## Check yourself

Take your longest prompt and count the output shapes it implies. Where there is more than one, split it into
that many calls and note which of them were being dropped silently before.
