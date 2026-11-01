---
title: Adding an endpoint through chat
summary: A worked change from request to merged branch, with the checks at each step.
chapter: Chat and edits
minutes: 13
status: draft
---

## The request

This lesson walks one change end to end through the chat panel. The library API needs an endpoint that
reports how many copies of a book are free. It is small enough for one sitting and it has every part a
larger change has: a type, a handler, a test and a review.

The request states the outcome and the constraints rather than the steps:

```text
Add a GET endpoint at /books/:id/available returning { available: number } for a known book and 404
for an unknown one. Follow the existing handler and error style in src/routes.
```

Naming the directory is what makes the constraint real. Without it the answer follows the model's
average of how APIs are written rather than the convention in your project.

## The first output and the first check

What comes back is a plan and a diff. Read the plan first, then the diff, and check three specific
things.

- The path and the parameter name, against the constraint you gave.
- The shape of the error, which should reuse the existing helper rather than inventing a second
  response format.
- Where the query lives, which should sit beside the other queries rather than inline in the handler.

## Running it before accepting

Nothing is accepted until it runs. Tests come first, and a failing test is the more useful outcome
because it names the assumption that was wrong.

```bash
node --experimental-strip-types --test
```

The flag is needed on Node 22, where type stripping is still behind it. From Node 23.6 the runtime
strips types on its own and the flag can be left out.

## The test it did not write

The test a model writes for a new handler is usually the happy path, because the handler was written
first. The case worth adding yourself is the book whose copies are all out, since that is the branch
the handler had to reason about:

```ts
test('a book with every copy out reports none free', () => {
  const out = available({ books: shelf.books, loans: [loan] }, 2)
  assert.equal(out, 0)
})
```

## The review before the commit

The last step is the one this course repeats in every chapter. Read the diff as a reviewer would, then
commit it as a single unit, with a message that says what changed rather than that a tool helped. The
commit message you would write for a colleague's work is the one this change deserves.

## Check yourself

Add the endpoint to your own service through chat, following the four steps in order: plan, diff, tests,
review. Write down the first thing that was wrong, and say whether the plan or the diff would have
caught it sooner.
