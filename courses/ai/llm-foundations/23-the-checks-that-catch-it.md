---
title: The checks that catch it
summary: Five checks, ordered by what they cost to run.
chapter: Failure
minutes: 13
status: draft
---

## Checks rather than suspicion

Reading more carefully does not catch a hallucination reliably, because a fluent answer defeats a careful read.
What catches it is a check with an outcome, something that passes or fails on its own.

Five of them, in the order you would reach for them.

## Does it compile or run

For code, a type check and a test are the cheapest filters available. An invented function name does not
resolve and an invented argument fails the call. That is why the courses on assistants put the check command
into the task description.

## Open the thing it cited

An answer naming a file, a line, a function or a version makes a claim you can verify in seconds. Open it. A
citation that does not exist invalidates the reasoning resting on it, so the rest of the answer is worth
discarding rather than reading.

## Search for the identifier

For a claim about a library, search the documentation for the exact identifier the model used. Not the concept,
the identifier. A name that appears nowhere is a name the model assembled, and it will look like every other
name in that library.

## Ask for the input that would prove it

The check that generalises furthest comes from the testing habits in another course: write the failing case
first. Where an answer claims a function handles a case, write the input for that case and run it. That turns a
claim about behaviour into a run.

## Count what is checkable

For prose the check is arithmetic. Count the specific claims in the answer: numbers, names, dates, limits. An
answer with none of them can be wrong in ways nobody can see, and an answer with many of them is a list of
things to verify. Both facts are worth having.

## Check yourself

Take one answer whose subject you can verify and run all five checks where they apply. Write down which check
found something, and which two you would keep as habits if you could keep only two.
