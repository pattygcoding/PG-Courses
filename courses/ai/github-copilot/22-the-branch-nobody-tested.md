---
title: The branch nobody tested
summary: Finding the code your suite never executes, before a customer does.
chapter: Tests
minutes: 12
status: draft
---

## Two ways to find the gap

The previous lesson found an uncovered branch by breaking the code, which works when you know where to
look. Two other approaches arrive at the same place from the opposite direction.

The first is coverage, which reports the lines and branches a run executed. Read it as a list of places
nobody has exercised rather than a score to raise. A file at forty percent has told you which part of
it is unverified.

The second is reading a function for its exits. Four `return` statements mean four outcomes, and each
one is a case somebody has to write:

```ts
export function borrow(
  catalogue: Catalogue,
  bookId: number,
  member: string,
  due: string,
): BorrowResult {
  const free = available(catalogue, bookId)
  if (free === undefined) {
    return { ok: false, reason: 'unknown-book' }
  }
  if (free <= 0) {
    return { ok: false, reason: 'no-copy' }
  }
  if (catalogue.loans.some((loan) => loan.bookId === bookId && loan.member === member)) {
    return { ok: false, reason: 'already-borrowed' }
  }
  return {
    ok: true,
    catalogue: { ...catalogue, loans: [...catalogue.loans, { bookId, member, due }] },
  }
}
```

Four exits, and the suite from the previous lesson reaches three. The one with no test is the duplicate
loan, which is also the one a generated suite skips most often, because reaching it needs a fixture
that already holds a loan.

## The cases a generated suite skips

Four families come up again and again.

- The empty case. An empty list, an empty string, a record that is not there.
- The boundary. Exactly at the limit, rather than either side of it.
- The second call. A function that has to be safe when run twice, which is where a duplicate check
  lives.
- The failure path. The branch that reports a problem, which needs a fixture set up to fail.

Each one needs a fixture the happy path did not require, which is why the fixture is the work.

## Writing the missing test

For the duplicate case the fixture carries a loan, and the assertion names the outcome:

```ts
test('a member holding the book cannot borrow it again', () => {
  const held: Catalogue = {
    books: shelf.books,
    loans: [{ bookId: 1, member: 'ada', due: '2026-12-01' }],
  }
  assert.deepEqual(borrow(held, 1, 'ada', '2026-12-02'), {
    ok: false,
    reason: 'already-borrowed',
  })
})
```

Run it. If it fails against the current code, the branch was wrong rather than untested, and the last
lesson of this chapter is about what to do then.

## Check yourself

Take a function with several exits and list them. Run your suite and use coverage to find the exit no
test reaches. Write the test for it, with a fixture built to reach that branch, and run it.
