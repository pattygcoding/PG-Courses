---
title: Why a generated test passes
summary: A test written from the code cannot disagree with the code.
chapter: Tests
minutes: 12
status: draft
---

## Written from the same source

A test is evidence when it was written before the code or independently of it. A test written from the
body it covers is a second copy of that body in another notation, and it agrees with the code for the
same reason a pair of scales agrees with itself.

Here is a suite for the loan functions. Four tests, and all four pass:

```ts
const shelf: Catalogue = {
  books: [
    { id: 1, title: 'The Poetic Edda', copies: 2 },
    { id: 2, title: 'Dune', copies: 1 },
  ],
  loans: [],
}

test('a copy can be borrowed', () => {
  const result = borrow(shelf, 1, 'ada', '2026-12-01')
  assert.equal(result.ok, true)
})

test('the loan is added to the catalogue', () => {
  const result = borrow(shelf, 1, 'ada', '2026-12-01')
  assert.equal(result.ok && result.catalogue.loans.length, 1)
})

test('the last copy cannot be borrowed twice', () => {
  const first = borrow(shelf, 2, 'ada', '2026-12-01')
  const second = first.ok ? borrow(first.catalogue, 2, 'grace', '2026-12-01') : first
  assert.deepEqual(second, { ok: false, reason: 'no-copy' })
})

test('the shelf is left alone when nothing is borrowed', () => {
  assert.equal(available(shelf, 1), 2)
})
```

Running it reports four passes:

```text
# tests 4
# pass 4
# fail 0
```

## What four passes do not say

Four green tests are a statement about those four inputs, and nothing about the inputs nobody wrote
down. The function has a branch that none of them reaches, the duplicate loan, and that branch appears
in no test at all.

A green suite that never executes a branch is not evidence about that branch. It is silence, and
silence reads like approval on a report.

## Why it happens

A generated test is written from the code, so it inherits the code's idea of what matters. `borrow`
checks three conditions in order, and a test written from the body covers the first two, because the
fixture for them is the one that was already there.

The same effect appears in tests written by hand under time pressure. The difference is that a person
knows which case they skipped.

## The habit

Treat a green run as the start of the review rather than the end. The question is not whether the tests
pass, but which branches the run touched, and the next lesson answers that by breaking the code.

## Check yourself

Run the suite above and count the tests. Count the branches in the function they cover, and note the
difference. Then write down the input that reaches the branch with no test.
