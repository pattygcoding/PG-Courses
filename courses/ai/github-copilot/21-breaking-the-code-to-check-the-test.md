---
title: Breaking the code to check the test
summary: A test is worth what it catches, and the only way to know is to introduce a bug.
chapter: Tests
minutes: 12
status: draft
---

## The check

A suite is evidence if it fails when the code breaks. There is one way to find out, and it takes a
minute. Change the code on purpose, run the tests, note which ones notice, and change it back.

Start with the comparison that decides whether a copy is free:

```ts
if (free <= 0) {
  return { ok: false, reason: 'no-copy' }
}
```

Change it to admit one more borrower:

```ts
if (free < 0) {
  return { ok: false, reason: 'no-copy' }
}
```

Run the suite and one test fails:

```text
ok 1 - a copy can be borrowed
ok 2 - the loan is added to the catalogue
not ok 3 - the last copy cannot be borrowed twice
  code: 'ERR_ASSERTION'
  failureType: 'testCodeFailure'
ok 4 - the shelf is left alone when nothing is borrowed
# tests 4
# pass 3
# fail 1
```

## Reading the result

The failure names the test, which is what a suite is for. The third test set up a book with one copy,
borrowed it, and asked again, so the boundary between "no copies left" and "one copy too many" is what
it checks. Reverting the change restores the four passes.

One bug caught, one fact learned. The suite is worth exactly that much and no more.

## The mutation nothing catches

Now break a different line, the one that reports a duplicate loan:

```ts
if (catalogue.loans.some((loan) => loan.bookId === bookId && loan.member === member)) {
  return { ok: false, reason: 'already-borrowed' }
}
```

Change `'already-borrowed'` to `'no-copy'` and run the suite:

```text
ok 1 - a copy can be borrowed
ok 2 - the loan is added to the catalogue
ok 3 - the last copy cannot be borrowed twice
ok 4 - the shelf is left alone when nothing is borrowed
# tests 4
# pass 4
# fail 0
```

Four passes against a function that now reports the wrong outcome for a whole branch. No test reaches
that line, so no test can disagree with it.

## Doing it systematically

Doing this by hand for every line is tedious, so tools exist that do it automatically and report the
share of changed lines the suite notices. The number is a mutation score, and it says more than
coverage does, because it asks whether the tests discriminate rather than whether they ran.

The tooling is not required to start. Breaking the three or four lines holding the decisions, for each
function you care about, finds most of what a suite is missing.

## Check yourself

Take a function with a suite you trust. Change one comparison, one constant and one string, running the
tests after each change. Write down which of the three the suite caught, then add the test for the one
it missed.
