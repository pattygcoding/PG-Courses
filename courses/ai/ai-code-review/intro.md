---
title: Reviewing AI code
level: Beginner
summary: Read a generated diff the way you read a colleague's, with provenance, correctness and the parts nobody checked.
labels:
  - AI
  - Review
  - Quality
minutes: 20
status: planned
---

## What this course is

A pull request written by a model looks like a pull request written by a careful person, and that is
the difficulty. The tone is even, the names are sensible, and nothing in the diff records which lines
came from a model, which were verified, and which the author never read.

Reviewing it is the same job as reviewing anything else with two additions. You cannot assume the
author understood the code, so a question about why a line is there can come back empty. And the
failures cluster: a dependency that does not exist, a test that asserts what the code already does, a
fix for a symptom that leaves the cause.

## Who it is for

You review code, or you have generated code and are about to send it somewhere. No background in
machine learning is needed.

## What you will build

A review of a generated change to the Northside Library API, written up as the comments a real review
would carry: the questions, the two blocking issues, and the patch that fixes them.

By the end you have a checklist that fits this project rather than a general one, and an instruction
file that tells a model and a reviewer what this codebase expects.

## Prerequisites

A repository with a diff you can review, and enough familiarity with the language to tell working code
from plausible code.

## How the pages are ordered

The first chapter is what a generated diff hides: the missing verification, the invented dependency,
and the test that agrees with the code. The second is how to read one, covering the order to read it
in, the questions worth asking, and the ones that waste a cycle.

The third is the specific smells: swallowed errors, silent fallbacks, duplicated logic, and comments
that restate the line beneath them. The fourth is provenance and licence, which matter for code that
arrived with terms attached.

The fifth is the review of the review: what to do when the change is large, when the author is the
model as well as the person, and how to record an approval that means something. The last chapter is
the instruction file, because a repository that states its rules spends its review on substance rather
than style.

Read them in order the first time, following the contents list on this page. Each chapter ends with a
diff to review and the comments you would leave on it.
