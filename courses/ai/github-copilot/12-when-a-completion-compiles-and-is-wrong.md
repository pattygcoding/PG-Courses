---
title: When a completion compiles and is wrong
summary: The failure that matters, because the compiler has nothing to say about it.
chapter: Completions
minutes: 12
status: draft
---

## The failure with no signal

A completion that does not compile is a gift. The editor underlines it, you fix it, and nothing reaches
a commit. The failures worth preparing for are the ones where the types line up and the behaviour does
not, because the compiler holds no opinion about behaviour.

Four shapes cover most of them.

## A boundary that moved

A comparison written as `>` rather than `>=` is the classic, and it stays invisible until a test
exercises the exact case. A function that reports how many copies are free:

```ts
export function available(catalogue: Catalogue, bookId: number): number | undefined {
  const book = catalogue.books.find((candidate) => candidate.id === bookId)
  if (!book) {
    return undefined
  }
  return book.copies - catalogue.loans.filter((loan) => loan.bookId === bookId).length
}
```

That version is right. A version that subtracted one, on the theory that a copy is always held back,
also compiles and is wrong for every book with spare copies.

## An error that is swallowed

Generated code returns defaults from `catch` blocks, because the file it learned from has one and
because a single return path is easier to write.

```ts
try {
  return JSON.parse(row.payload) as Loan
} catch {
  return undefined
}
```

The types allow it. The behaviour is that a corrupt row becomes a missing row, and the report you get
three months later says a loan disappeared without anyone deleting it.

## A name that exists and means something else

The third shape is a call that resolves and does the wrong thing. `trim` where the data needs
`trimEnd`. A date helper that mutates its argument. A sort that is not stable. Types catch a function
that does not exist; they say nothing about a function that exists with different semantics.

The compiler cannot help here, and neither can a careful read, because the code reads correctly. Only a
test asserting the behaviour can.

## The habit that finds all four

One practice covers every shape above, and it is not reading harder. Break the code on purpose and
confirm that a test fails. Until that test exists, the only verification available is running the code
against input you know the answer for.

## Check yourself

Take one accepted completion from your repository and write down the input that would expose it if the
behaviour were wrong. Run the code with that input. If it survives, look for a second input; if the
behaviour surprises you, you have found what the lesson was describing.
