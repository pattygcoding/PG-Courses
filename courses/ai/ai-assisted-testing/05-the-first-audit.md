---
title: The first audit
summary: Writing the tests the generated suite left out.
chapter: What a generated test is worth
minutes: 13
status: draft
---

## The job

An audit is not a rewrite. It is a pass over the uncovered branches and the surviving mutants, adding the
tests that turn each one into a failure.

The mutants name the work. Nine survivors, and each says which assertion is missing, in the terms of the
behaviour rather than of the code.

## Three of the tests added

One per hole, and nine in total. Three of them:

```ts
test('an unknown book is named as unknown', () => {
  assert.deepEqual(borrow(shelf, 99, 'ada', '2026-12-01'), {
    ok: false,
    reason: 'unknown-book',
  })
})

test('a member holding the book cannot borrow it again', () => {
  assert.deepEqual(borrow(withLoan(1, 'ada', '2026-12-01'), 1, 'ada', '2026-12-02'), {
    ok: false,
    reason: 'already-borrowed',
  })
})

test('a loan due today is not overdue, and yesterday is', () => {
  assert.equal(overdueCount(withLoan(1, 'ada', '2026-06-01'), '2026-06-01'), 0)
  assert.equal(overdueCount(withLoan(1, 'ada', '2026-05-31'), '2026-06-01'), 1)
})
```

The third is the boundary case, and the pair of assertions is the point. One either side of the limit pins
the comparison, where a single assertion would pass with either operator.

## The result

```text
# tests 13
# pass 13
# fail 0
```

Thirteen tests, all passing, and the two measurements that matter:

```text
coverage   100.00 lines   100.00 branches   100.00 functions
mutation   9/10 = 90%
```

Lines moved from 89 to 100 and branches from 62 to 100, which is the larger of the two changes and the
expected one: the audit went after decisions rather than statements.

## What the audit cost

Nine tests for nine survivors, each short, and the mutants said which to write. That is the argument for
measuring first. The same nine tests written by reading the code would have taken longer and landed somewhere
else.

## Check yourself

Run the three mutants from the previous lesson against your suite, write the test for each survivor, and
record the new score. Then note whether the test you wrote for a comparison asserts both sides of it.
