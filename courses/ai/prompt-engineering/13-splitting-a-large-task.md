---
title: Splitting a large task
summary: Cutting by artefact rather than by step.
chapter: Decomposition
minutes: 12
status: draft
---

## Cut by artefact

The useful split is by artefact rather than by step. One call produces the migration, another the test, a
third the changelog. Each has an output shape, each can be checked, and each can be rerun without the others.

Splitting by step, as in "read the file, then write the function, then run the test", produces a conversation
where nothing has a shape and the state lives in the history.

## Why the conversation shape fails

State kept in a conversation is invisible to a test. A four-step conversation can only be evaluated by
reading the transcript, and rerunning it means replaying all four steps in order. Four calls with shapes can
be evaluated one at a time, and any one of them can be repeated with a change.

## Keeping the pieces consistent

The risk of splitting is drift: the migration names a column the test does not use. Two fixes, and the second
is the stronger one.

- Pass the earlier artefacts into the later calls rather than relying on the model to remember them.
- Assert the consistency in code, comparing the identifiers in one result against the other.

The second keeps working when the prompts change, which is the difference between a rule and a habit.

## Where the boundary goes

Put the boundary where a person would want to stop and look. A migration is worth reviewing before a test is
written against it, so the boundary belongs there. That is a better guide than counting tokens.

## Check yourself

Take one large prompt and cut it into artefacts. For each piece write the output shape and the one check that
would catch it drifting from the others, then run the first two and see whether the identifiers agree.
