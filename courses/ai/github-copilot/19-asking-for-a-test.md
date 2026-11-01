---
title: Asking for a test
summary: The instruction that produces a test worth running, and the one that produces a copy of the code.
chapter: Tests
minutes: 11
status: draft
---

## The instruction shapes the answer

A test written from a function agrees with that function. Ask for a test for a function and the answer
is built from the body, so it asserts what the body already does, including the part that is wrong.

The fix is in the instruction. Describe the behaviour to assert rather than the function to cover.

```text
Write a test that fails if a member borrows the last copy of a book while another member holds it.
```

That sentence names a situation and an outcome. A test written from it has to build the situation,
which makes the fixture part of the work rather than whatever the function happened to need.

## The fixture first

Most of the value sits in the fixture, because the fixture decides which cases are easy to express. A
catalogue with one scarce book and one plentiful book covers the interesting branches:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { available, borrow, type Catalogue } from './loans.ts'

const shelf: Catalogue = {
  books: [
    { id: 1, title: 'The Poetic Edda', copies: 2 },
    { id: 2, title: 'Dune', copies: 1 },
  ],
  loans: [],
}
```

Write the fixture yourself, or read the one you were given. A fixture with one book and one copy
cannot express the difference between "the last copy" and "any copy", and that difference is what the
interesting tests are about.

## Tests that assert nothing useful

Three failures to look for in a generated test.

- An assertion that the result is defined, where the point was which result it was.
- A test that calls the code and asserts it does not throw, which passes for a function that returns
  the wrong answer without complaining.
- A test named after the function rather than the case, so a failure says nothing about what broke.

## Running them

Run the file as soon as it exists, before reading it closely. A test that passes on the first run has
proved very little, which is the next lesson.

```bash
node --experimental-strip-types --test
```

## Check yourself

Ask for a test for a function in your repository using the function name, then ask again using a
sentence about a situation and an outcome. Run both. Write down which of the two would still pass if
the function returned the wrong value.
