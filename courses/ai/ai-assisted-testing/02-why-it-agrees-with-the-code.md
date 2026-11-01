---
title: Why it agrees with the code
summary: A test written from the body is a second copy of the body in another notation.
chapter: What a generated test is worth
minutes: 12
status: draft
---

## The direction of writing

A test written before the code states a requirement, and the code has to satisfy it. A test written after the
code describes what the code does, and it satisfies itself.

Generated tests are written from the code, so they inherit the code's view of what matters. A branch the
author never considered is a branch the test never visits, and the suite is green throughout.

## The same conclusion twice

The clearest way to see it is to break the code and watch. That measurement is the middle of this chapter,
and the first result is worth stating plainly: four passing tests caught one change in ten.

```text
suite: generated.test.ts
  SURVIVED  count every loan rather than this book
  SURVIVED  add the copies out instead of subtracting them
  SURVIVED  treat a missing book as a null
  SURVIVED  allow a borrow when no copy is free
  SURVIVED  refuse a borrow only when the shelf is empty
  SURVIVED  report an unknown book as no copy
  SURVIVED  report a duplicate loan as no copy
  killed    invert the renew guard
  SURVIVED  renew every loan of the book
  SURVIVED  call a loan overdue on its due date

score 1/10 = 10%
```

Nine changes to the behaviour, and the suite agreed with all nine.

## Why the agreement is systematic

The four tests exercise the happy path and its immediate neighbour. Every surviving change sits on a path the
tests do not take, and a test that never executes a line cannot disagree with it.

So the fault is not that the model wrote bad tests. It is that the tests were written from the wrong source,
and any suite written that way has the same hole in it.

## What the suite does establish

It establishes that four specific calls return without throwing and produce the values written down. That is
worth having as a smoke test, and it is not a check on the rules. Keeping the two apart is what stops a green
suite from ending the conversation.

## Check yourself

Take a function whose branches you know and count its exits. Then count how many your tests reach, without
running coverage. Compare both numbers with what the coverage report says.
