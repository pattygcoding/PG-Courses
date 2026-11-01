---
title: A plan before an answer
summary: Where the answer depends on a choice, make the choice the first call.
chapter: Decomposition
minutes: 12
status: draft
---

## The shape of the problem

Some tasks have a decision at the top. Which table holds this, which of two APIs to use, whether the change
belongs in the handler or in the query. Asking for the final artefact directly makes the model take that
decision inside the answer, invisibly, where the only way to inspect it is to read the whole thing.

A first call that returns the decision makes it checkable. A second call taking the decision as input
produces the artefact.

## The two-call shape

```text
call 1  input: the description
        output: {"table": "...", "columns": [...], "reason": "..."}

call 2  input: the description and the decision from call 1
        output: the migration
```

`reason` is the field worth having. It is a short justification, and it is the field a person reads when the
decision is wrong.

## What it costs

Two calls cost more than one and the input is sent twice. Two things pay for it. The decision is reviewable
in a few lines rather than buried in a diff, and a wrong decision is caught before the artefact exists
rather than after.

Where the decision is trivial and the artefact is short, the second call is overhead. The split earns its
place when the decision has more than one reasonable answer.

## The version that returns prose

A plan call returning a paragraph is harder to use than one returning a small object, because nothing in it
can be checked. The argument from the previous chapter applies: name the shape, and put the reasoning in a
field rather than around the value.

## Check yourself

Find a prompt where the answer implies a decision. Split it into two calls, with the first returning the
decision and a reason, then run the pair on one input. Say whether the decision matched the one buried in the
single-call answer.
