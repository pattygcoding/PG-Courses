---
title: Top-p and top-k
summary: Cutting the tail of the distribution before the draw.
chapter: Generation
minutes: 12
status: draft
---

## Why temperature is not enough

Temperature changes the shape of a distribution and leaves the tail in place, so an unlikely token stays
possible at any temperature above zero. Across a long answer that is enough to produce a word that does not
belong.

Top-k keeps the `k` most likely tokens. Top-p keeps the smallest set whose probabilities reach `p`. Both
remove candidates before the draw.

## What top-p does here

At a temperature of 1.7 the distribution is nearly flat, so the tail is long. Cutting it changes the answer
with the seed held fixed:

```text
temperature 1.7 with top-p 0.9, seed 1:
  the librarian . the reader returned the book to the librarian checked the catalogue for the

temperature 1 with top-p 0.6, seed 1:
  the librarian . the librarian . the librarian . the librarian . the librarian renewed the
```

The second is instructive. With the tail cut to 0.6 the model keeps choosing the same opener, so the output
reads as a loop with the temperature at one. Narrowing the candidate set can make the output duller rather
than safer.

## The interaction

The two settings meet in a fixed order: temperature scales the logits, the cut removes candidates, then the
draw happens. A high temperature with a narrow top-p therefore keeps a wide spread inside a small set, which
is often a better combination than either setting alone.

Two starting points that hold up: top-p near 0.9 with temperature near 1 for prose, top-p near 0.9 with
temperature near 0.2 for code.

## What neither setting fixes

Neither one makes the output correct. A wrong answer the model finds likely stays likely at any temperature.
Sampling settings buy variety and protection against nonsense, and they say nothing about truth.

## Check yourself

Take a prompt that produced a token you judged wrong and run it again with a narrower top-p. Record whether
the token came back, and whether the answer lost anything else in the process.
