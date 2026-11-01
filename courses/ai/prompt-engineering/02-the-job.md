---
title: The job
summary: State the outcome, not the steps.
chapter: The shape of an instruction
minutes: 11
status: draft
---

## Outcome rather than a list of edits

The job is the state of the world once the call has succeeded. Written as a list of steps to perform, it
turns the model into an executor and removes the part it is good at, which is working out how.

Compare:

```text
Add a check to the loans handler.
```

```text
A second loan of the same book to the same member is refused with the reason already-borrowed.
```

The second is a statement about the system, so any implementation producing it counts as correct. The first
names a place, which invites the change even when the place is the wrong one.

## What the job is not

A job is not the diff, and it is not a restatement of a function name. "Write a function called renew"
specifies a signature and nothing about behaviour, which is how a model produces something that compiles
and does the wrong thing.

## Two questions that test it

- Could a colleague tell, without reading the code, whether it holds?
- Does it name a file? If a file is named, that is a constraint, and it belongs with the constraints.

## The job in the suite

The migration prompt's job is a migration whose `down` reverses its `up`. That is a property, and it is what
the check tests:

```text
  FAIL  an index on an existing column
          down does not mention DROP INDEX
          down wrongly mentions DROP COLUMN
```

The job was stated, the model produced a down migration, and the down did not reverse the up. Without the
job written down, that failure would be a matter of taste.

## Check yourself

Rewrite three prompts you have used so each opens with a statement about the system rather than a list of
edits. Then pick the one where you cannot write such a statement, and work out what is missing from your own
understanding of the task.
