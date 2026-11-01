---
title: Plan and act
summary: The two modes, and why the plan is the cheaper place to correct a mistake.
chapter: Setting it up
minutes: 12
status: draft
---

## Two modes

An agent usually offers a mode that only investigates and a mode that changes files. In the
investigating mode it reads, searches and reasons, and produces a plan. In the other mode it edits,
writes and runs commands.

Names differ between products, so you may see plan and act, ask and code, or chat and agent. The
distinction is the one that matters, and it is the difference between a proposal and a change.

## Why the split exists

A plan is cheap to correct. It is a paragraph, and a wrong file in a paragraph costs one sentence to
fix. The same wrong file in act mode costs an edit you have to notice, read and revert, and the reading
is the expensive part.

The split also gives the model a chance to gather context before committing to a shape. A plan built
after searching for the existing code is better than one built from the file you named, and the
searching happens in plan mode.

## What a plan worth approving looks like

It names the files, states the change to each, and says what will be run to check the result. Three
lines are often enough:

```text
Read src/routes/books.ts and src/routes/loans.ts to copy the handler style.
Add a handler for GET /books/:id/available in src/routes/books.ts.
Add a test in src/routes/books.test.ts and run node --experimental-strip-types --test.
```

A plan that names no file is a restatement of your instruction and tells you nothing. Asking which
files it intends to touch is a reasonable reply.

## Moving between the modes

The usual pattern is a plan for anything touching more than one file, or anything you have not done
before, and act for a change you can describe precisely. On a small change the plan is overhead. On a
change across four files it is the cheapest review available.

## Check yourself

Give the same task in plan mode and in act mode, on a copy of a repository you can throw away. Compare
the two: which files each touched, and which you would have had to correct afterwards.
