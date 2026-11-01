---
title: When a result looks right
summary: The shapes a wrong answer takes, and the one sentence that catches them.
chapter: Failure
minutes: 12
status: draft
---

## Familiarity is not verification

The strongest signal people use when reviewing model output is whether it looks like something they have seen
before. That is the wrong signal, because the model produces familiar-looking output by construction.

What replaces it is a short list of shapes to look for, because generated mistakes cluster.

## Six shapes

- A name that fits the naming convention of the file and does not exist.
- A call with an argument that was never in a released version.
- A test that asserts the behaviour of the code above it rather than the rule it was meant to check.
- An error path that returns a default where the rest of the file reports a failure.
- A comment that restates the line beneath it, which is what a comment looks like when its author had no
  reason to write one.
- A summary longer than the work, which usually means the work was smaller than the summary implies.

## The three that cost most

Of those, three do real damage: the invented name, the wrong failure shape, and the test that agrees with the
code. All three survive a careful read, so reading harder is not the fix. Each is caught by running something,
which is the argument for the check over the review.

## The sentence to write

When a change arrives, write one sentence: what has to be true for this to work. Then check that one thing. For
an added function the sentence is that the function is called with the arguments the diff assumes. For a new
endpoint it is that the failure case returns the shape the rest of the service returns.

One sentence and one check beat a page of reading, and the sentence is also the thing you would ask a colleague.

## Check yourself

Take a generated change and write the one sentence for it. Run the single check the sentence implies and record
the result. If the sentence is hard to write, say why, because that difficulty is the finding.
