---
title: The case the type does not cover
summary: A failing test that reveals a gap in the domain rather than in the code.
chapter: Verification
minutes: 13
status: draft
---

## Writing the test the change left out

The change from the previous lessons added a renewal function that returns `no-copy` when the loan does
not exist. That reads as wrong, and the way to turn a reading into evidence is to write the test that
states what the reason should be.

```ts
test('renewing a loan that does not exist names the missing loan', () => {
  assert.deepEqual(renew(shelf, 1, 'ada', '2026-12-15'), { ok: false, reason: 'no-loan' })
})
```

## Running it

```bash
node --experimental-strip-types --test
```

```text
ok 1 - a copy can be borrowed
ok 2 - the last copy cannot be borrowed twice
not ok 3 - renewing a loan that does not exist names the missing loan
    + actual - expected
    +   reason: 'no-copy'
    -   reason: 'no-loan'
    reason: 'no-loan'
    reason: 'no-copy'
# tests 3
# pass 2
# fail 1
```

The failure is the finding. The function reports a full shelf when the real problem is that no such loan
exists, so a caller reading the reason goes looking for copies rather than for the loan.

## Why the code did that

The failure type is the interesting part:

```ts
export type BorrowFailure = 'unknown-book' | 'no-copy' | 'already-borrowed'
```

Three outcomes, and none of them describes a loan that does not exist. The renewal function had to return
something, so it reached for the nearest reason available. The gap is in the type rather than in the
`return` statement, and the diff showed the symptom of it.

That shape is worth recognising, because it is what a model produces most often when the domain type is
incomplete. The code compiles, the branch is plausible, and the mistake sits upstream in a declaration
the task never mentioned.

## The fix

Adding the case and returning it is a small change:

```ts
export type BorrowFailure = 'unknown-book' | 'no-copy' | 'already-borrowed' | 'no-loan'
```

The test then passes, and the compiler points at every place that switches on `BorrowFailure` without
considering the fourth case. That is the check the earlier change needed, and it arrives for free once
the type is right.

## Check yourself

Take a failure branch an agent wrote and name the outcome it returns. Ask whether that outcome describes
the situation. Where it does not, add the missing case to the type, write the test, and see whether the
compiler finds a second place that needs it.
