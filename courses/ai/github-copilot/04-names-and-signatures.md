---
title: Names and signatures
summary: The two lines you already write decide more of the completion than the prompt does.
chapter: How the tool sees your code
minutes: 11
status: draft
---

## A signature is a prompt

The model continues what is in front of it, so the signature you write is the largest part of the
instruction. A vague signature gets a vague body, and the vagueness is hard to see afterwards because
the code compiles.

Compare two ways to ask for the same thing:

```ts
export function process(data: any): any
```

```ts
export function availableCopies(catalogue: Catalogue, bookId: number): number
```

The second one tells the model the domain, the two inputs and the type of the answer. A continuation
from that line will reach for `catalogue.books` and `catalogue.loans`, because those are the obvious
fields of the type it was handed. The first one has nothing to reach for.

## Types as instructions

Types carry the rules that a comment would otherwise have to spell out. A parameter typed as
`'unknown-book' | 'no-copy' | 'already-borrowed'` tells the model the three outcomes it has to produce,
which is why a result union is a better prompt than a boolean:

```ts
export type BorrowFailure = 'unknown-book' | 'no-copy' | 'already-borrowed'
```

A function returning `BorrowFailure | undefined` leads to a body with three branches. A function
returning `boolean` leads to a body that picks one condition and ignores the other two, and the
ignored ones are exactly the branches you wanted to see.

## Naming for the reader you are not

The name is read twice: once by the person maintaining the file, and once by the model predicting from
it. Those two readings want the same thing, which is a name that says what the function does rather
than how. `getData`, `handle`, `process` and `utils` are empty in both readings.

Verb first for a function, as in `available` or `placeLoan`. A domain noun for a type, as in
`Catalogue` rather than `Data`. Plural for a collection. Those three conventions cost nothing and give
every later completion more to work with.

## Redoing a completion that missed

When the body is wrong, the fastest fix is usually to change the line above it and ask again rather
than to patch what arrived. Return to the signature, add the type that was missing, or move a
condition into the name, then delete the body and let it be written again. Rewriting the request takes
seconds; reasoning your way through someone else's wrong shape takes longer.

## Check yourself

Find a function in your repository typed with `any`, `string` or a bare `boolean`. Rewrite its
signature with the types the domain actually has, then delete the body and accept the completion.
Compare the number of branches in the new body with the old one and note which branch is new.
