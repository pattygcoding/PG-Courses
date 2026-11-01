---
title: GitHub Copilot
level: Beginner
summary: Use Copilot for completions, chat and tests, and learn where its suggestions are wrong.
labels:
  - AI
  - Tooling
  - Editor
minutes: 20
status: draft
---

## What this course is

Copilot is an editor feature that predicts the next few lines while you type, and a chat panel that
answers questions about the code in front of you. The prediction is a language model completing a
pattern, so it is strongest on the parts of a program that look like every other program: a loop over
a list, a test for a function, a route that reads a value and writes a row.

The failure mode is the part worth learning. A completion reads like your code, appears in your file
with no marker on it, and can be wrong in the way that still compiles. This course works through where
the suggestions earn their place, how to steer them with a comment or a name, and how to check the
result before it reaches a review.

## Who it is for

You write code most days and you have Copilot installed but use it without much of a method. You do
not need any background in machine learning.

If you have a week of experience with it, this course covers what a week does not show: the context
the model actually receives, why one suggestion is right and the next is confident and wrong, and how
to arrange a file so the good completions become more likely.

## What you will build

An endpoint added to the Northside Library API with Copilot doing part of the typing: the handler, its
types, its tests and its documentation, plus a short note per file on what the model wrote, what you
changed and why.

By the end the repository has a working endpoint and a test that fails when the handler is broken. The
notes are the more useful artefact, because they are the record a review of machine-written code has
to reconstruct.

## Prerequisites

An editor with Copilot or a comparable completion tool, and a repository you can break without
consequence. The examples are Node.js and TypeScript, so the JavaScript and TypeScript courses in this
catalogue cover anything you are missing.

## How the pages are ordered

The first chapter is what the tool sees: the file you are in, the tabs you have open, and the comment
above the cursor. The second is completions, from accepting a line to steering a whole function with a
signature and a name.

The third is chat and its modes, including questions about a codebase and edits that touch more than
one file. The fourth is tests: generating them with the tool, then checking whether they would fail if
the code were wrong.

The last chapter is the working practice, covering drafting, verifying, reviewing, and the cases where
writing the code yourself is faster than reading a suggestion and deciding.

Read them in order the first time, following the contents list on this page. After that, use the
contents list as a reference.
