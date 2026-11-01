---
title: The review you owe it
summary: The pull request that records what was checked and what was not.
chapter: Verification
minutes: 12
status: draft
---

## The review is the same review

A change produced by an agent goes through the review you would give any change, with one difference. The
author cannot answer a question, so the code is the whole of the evidence, and a question you would
normally ask becomes one you have to answer by running something.

That makes the review slower rather than harder, and it puts the weight on verification instead of on
reading.

## What to write down

Three comments make a review worth reading later.

- What the change does, in a sentence, which is the claim the rest of the review tests.
- What you ran to check it, with the command and the result.
- What no test covers, named specifically, so the next person can decide whether it needs one.

The third comment is what distinguishes a review of generated code. A branch nobody tested is invisible
in a green suite and obvious in a comment that names it.

## The checks that belong in the repository

Where a review keeps finding the same gap, that gap belongs in a check rather than in the next review.
Three kinds convert well.

- A lint rule for the convention that was missed, such as a disallowed import or a required return type.
- A test asserting a structural property, such as every failure case having a test.
- A line in the rules file, where the fix is guidance rather than something a tool can see.

Each one moves the work from your attention into the build, which is the only way the review load stops
growing with the number of tasks.

## The habit that outlasts the tooling

One habit survives every change of product. Before approving, name the evidence for the claim that the
change works. Where the evidence is a command you have watched run, the review is done. Where it is the
agent's own summary, there is no evidence yet, and the change is one command away from having some.

## Check yourself

Take your last generated change and write the three comments for it. Then take the gap you named and
convert it into a check: a lint rule, a test or a line in the rules file. Run your suite and confirm the
new check passes.
