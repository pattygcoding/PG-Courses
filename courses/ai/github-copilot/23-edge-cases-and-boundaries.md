---
title: Edge cases and boundaries
summary: The inputs either side of a limit, and the ones that are empty.
chapter: Tests
minutes: 11
status: draft
---

## Boundaries are where the bugs are

Most decisions in a program are comparisons, and a comparison has a boundary. The mistake is rarely in
the body of a calculation. It is in the operator, or in which of two limits the code treated as
inclusive.

Testing a boundary means three inputs rather than one. Below the limit, exactly at it, and above it.

```ts
test('a book with two copies allows the second borrower', () => {
  const first = borrow(shelf, 1, 'ada', '2026-12-01')
  const second = first.ok ? borrow(first.catalogue, 1, 'grace', '2026-12-01') : first
  assert.equal(second.ok, true)
})

test('a book with two copies refuses the third borrower', () => {
  const first = borrow(shelf, 1, 'ada', '2026-12-01')
  const second = first.ok ? borrow(first.catalogue, 1, 'grace', '2026-12-01') : first
  const third = second.ok ? borrow(second.catalogue, 1, 'alan', '2026-12-01') : second
  assert.deepEqual(third, { ok: false, reason: 'no-copy' })
})
```

Those two differ by one borrower, and between them they pin the limit. The mutation from the earlier
lesson, turning `<=` into `<`, fails one of them.

## Empty and absent

The second family is the input that is not there. An empty list, a string of no characters, a record
that does not exist, a count of zero. Each is a plausible first call in production and an unlikely
case in a fixture built for the happy path.

For the loan functions the absent case is an unknown book, and the code already returns a distinct
outcome for it. The test needs a fixture without that book, which is a second fixture rather than a
second assertion.

## Cases that cannot happen yet

Some inputs are impossible today and become possible later, which makes them worth a test with a note.
A due date in the past is a good example. Every current caller sends a future date, so nothing covers
the past, and the first caller that computes a renewal will.

Write the test when you notice the assumption, and say in the name why it exists.

## What not to test

Do not test the language. A test asserting that an empty array has length zero tests the runtime. The
value of an edge case test is that it fails when your decision changes, so it belongs on a comparison
you wrote.

## Check yourself

Find a comparison in your repository and write three tests for it, one below the boundary, one at it
and one above. Run them. Then change the operator and confirm that exactly one of the three fails.
