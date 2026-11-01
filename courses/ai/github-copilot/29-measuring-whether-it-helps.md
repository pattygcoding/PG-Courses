---
title: Measuring whether it helps
summary: Two counts that say whether the tool is earning its place.
chapter: Working practice
minutes: 12
status: draft
---

## Why a measurement

Feelings about a tool like this are unreliable in both directions. A good completion is memorable and a
wrong one is infuriating, and whichever happened most recently is the one that gets quoted. Two counts
are more useful than either memory.

## Rework

Take a sample of changes and count how many lines were written and then changed before the commit, or
changed again inside a week. A high rate says the first version was wrong, and rework on generated
lines is the clearest sign that review is not keeping up.

The count is easy to take from version control. Using blame on a file, look at how many of the surviving
lines were written recently and how many commits touched them. A file where most lines come from one
commit has settled. A file where the same lines keep changing has not.

## Review load

Count the comments a change attracts. If generated changes attract more comments than hand-written
changes of the same size, the first draft is missing the conventions, and the repository instructions
from the previous lesson are where to fix that.

## What the numbers will show

Two outcomes are normal and neither is a failure. The tool helps in proportion to how patterned the
work is, which makes its value high in the repetitive parts of a repository and low in the parts that
are genuinely new. And the value rises as the repository states its conventions, because the
suggestions have better material to follow.

Neither count is a productivity figure. Cycle time and lines of code are both easy to move without
shipping anything, which is why these two are the ones worth keeping.

## Check yourself

Pick one file and count how many of its lines were touched in a second commit within a week of the
first. Repeat on a file written by hand. Compare the two, then write one convention worth adding to
your repository instructions.
