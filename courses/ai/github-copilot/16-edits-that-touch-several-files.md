---
title: Edits that touch several files
summary: Multi-file edits, the diff they produce, and the checks that belong before accepting.
chapter: Chat and edits
minutes: 12
status: draft
---

## A mode that plans first

Editors now offer a mode where the model plans a change, reads the files it decides are relevant, and
proposes edits across several of them. The interface differs between products and versions; the shape
of the interaction is stable. You describe the outcome, it states a plan, it touches files, and you
review the result.

That is a larger unit of change than a completion, and it needs a larger unit of checking.

## What the plan is for

The plan is the cheapest place to catch a mistake. A plan naming a file you know is irrelevant, or
missing the one that actually holds the code, is telling you the model has the wrong picture of the
repository. Correcting the plan is faster than reading four wrong edits and working out why.

Read the plan as a list of claims about your repository. Every file it names is a claim that the change
belongs there.

## The diff is the artefact

Whatever the interface, the thing to review is the diff. Three checks belong in that review, and a
multi-file change makes all three easy to skip.

- Files nobody mentioned. A helper touched for a reason you cannot state, or a configuration file
  changed as a side effect.
- Tests that were changed rather than added. An edit that adjusts an assertion to match new behaviour
  is the clearest sign that the behaviour changed by accident.
- Imports for packages you do not have. The change compiles in the model's imagination and not in your
  lock file.

## The order to accept in

Tests and types come first. Run them against the proposed state before deciding anything, and a failing
test turns a judgement call about whether the code is good into a question with an answer.

Then read the diff. Then commit once, rather than in several pieces, so the change can be reverted as
a unit if the review fails tomorrow.

## Check yourself

Ask for a change that touches at least three files in your repository. Before reading any edit, write
down the files you expect it to touch and compare that list with the plan. Then run your test suite
against the proposed change and note whether it was green before you read a line of the diff.
