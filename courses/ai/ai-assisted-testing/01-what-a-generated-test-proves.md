---
title: What a generated test proves
summary: A passing test is a claim about one input, and the claim is only as good as the input.
chapter: What a generated test is worth
minutes: 11
status: draft
---

## The claim a passing test makes

A test that passes says one thing: for this input, the program did what the assertion expected. It says
nothing about any other input, and nothing about whether the assertion was worth making.

That is not a flaw in generated tests. It is what a test is, and it is why a suite is described by the inputs
it covers rather than by its size.

## A suite in four tests

A generated suite for the loan rules, written from the code rather than from the requirements:

```ts
test('a copy can be borrowed', () => {
  const result = borrow(shelf, 1, 'ada', '2026-12-01')
  assert.equal(result.ok, true)
})

test('the loan is added to the catalogue', () => {
  const result = borrow(shelf, 1, 'ada', '2026-12-01')
  assert.equal(result.ok && result.catalogue.loans.length, 1)
})
```

Two of the four. Both assert something true. Running the file:

```text
# tests 4
# pass 4
# fail 0
```

Four passes, and the number is not yet evidence of anything, because nothing has asked which inputs they
used or what they left alone.

## The question to ask

One question replaces the pass count. Which change to the program would make this test fail? If the honest
answer is a rename, or nothing at all, the test is a statement about the code's current text rather than
about its behaviour.

The rest of this chapter runs that question against these four tests.

## Why generated tests have this shape

A model writing a test from a function starts with the function. The fixture it invents is the one the first
branch needs, and the assertion it writes is the one the return value suggests. The result agrees with the
code by construction, which is the next lesson.

## Check yourself

Take a test in your own suite and write down the single change to the program that would make it fail. Then
write down the change that would break the behaviour while leaving the test green. If the second answer comes
more easily than the first, the test is checking the wrong thing.
