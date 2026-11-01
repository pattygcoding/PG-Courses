---
title: Completing a function from its signature
summary: A worked example that starts at the declaration and ends with a body you check.
chapter: Completions
minutes: 12
status: draft
---

## Starting from the types

This lesson works through one function in the library API, from the line you write to the body you
keep. The function decides whether a copy can be borrowed, which is small enough to hold in your head
and has enough branches to be interesting.

The types come first, because they are part of the instruction:

```ts
export interface Book {
  readonly id: number
  readonly title: string
  readonly copies: number
}

export interface Loan {
  readonly bookId: number
  readonly member: string
  readonly due: string
}

export interface Catalogue {
  readonly books: readonly Book[]
  readonly loans: readonly Loan[]
}
```

## The declaration, with the rule in a comment

Then the declaration. The comment states the three outcomes, because the type says there are three and
not what they are:

```ts
export type BorrowFailure = 'unknown-book' | 'no-copy' | 'already-borrowed'

// Fails when the book is unknown, every copy is out, or this member holds one already.
export function canBorrow(
  catalogue: Catalogue,
  bookId: number,
  member: string,
): BorrowFailure | true
```

## Reading what arrives

A body written from that declaration has three branches, and each one can be checked against the
sentence above it:

```ts
export function canBorrow(
  catalogue: Catalogue,
  bookId: number,
  member: string,
): BorrowFailure | true {
  const book = catalogue.books.find((candidate) => candidate.id === bookId)
  if (book === undefined) {
    return 'unknown-book'
  }

  const out = catalogue.loans.filter((loan) => loan.bookId === bookId).length
  if (out >= book.copies) {
    return 'no-copy'
  }

  const held = catalogue.loans.some(
    (loan) => loan.bookId === bookId && loan.member === member,
  )
  if (held) {
    return 'already-borrowed'
  }

  return true
}
```

Three things are worth checking before accepting a body like that. The order of the branches, since a
member who already holds a book and finds no copies free gets one answer and not the other. The
boundary, here `out >= book.copies` rather than `>`. And the lookup, which names the parameter
`candidate` because the file around it does.

## What this example is not

The body above is what a capable model produces from those types and that comment. It is not a claim
about which editor version produces what. Run it against your own data before trusting it, which is
what the next lesson is about.

## Check yourself

Write the same three types and the same comment in your own project, for a function whose rules you
know. Accept the body. Then change one word of the comment to move a boundary, from "every copy" to
"more than half the copies", and ask for the body again. Note which line changed.
