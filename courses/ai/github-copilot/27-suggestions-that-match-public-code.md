---
title: Suggestions that match public code
summary: The filter that catches verbatim copies, and the licence question it leaves open.
chapter: Working practice
minutes: 11
status: draft
---

## A large block is a signal

Most suggestions are assembled from patterns rather than lifted from one place, and the result looks
like the code around it. Occasionally one arrives as a substantial block that is unusually specific: a
named algorithm, a comment in a voice you did not write, a naming scheme that does not match the file.
That is the shape worth pausing on.

## The filter

Editors offer a setting that suppresses suggestions which match public code, usually described as a
filter for suggestions matching public code. Finding whether it is on takes a moment, and the answer
belongs in the same note as the account settings from the second lesson.

The setting is a filter rather than a guarantee. It reduces the chance of a verbatim copy surfacing. It
does not tell you the provenance of a block that arrives in a strange voice.

## The licence question

Provenance matters because code carries terms. A block reproduced from a repository under a copyleft
licence can bring obligations with it, and those obligations do not disappear because a tool produced
the text instead of a person copying it by hand.

The practical response has three parts. Keep the filter on where the setting exists. Treat an unusual
block as a question to answer before committing rather than after. And when the block is large enough
to matter, search for a distinctive line from it and see what comes back.

## What this does not change

Most code in most repositories is unremarkable, and a suggestion that assembles a loop over a list is
not a provenance problem. The check is worth the minute it takes when the change is large, specific, or
going into a repository whose authors care about its licence.

## Check yourself

Find the public-code filter in your editor settings and note whether it is on. Then take the largest
block you have accepted in the last month and search for one distinctive line from it. Write down what
you found, including finding nothing.
