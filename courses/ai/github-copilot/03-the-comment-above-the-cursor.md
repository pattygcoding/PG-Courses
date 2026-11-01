---
title: The comment above the cursor
summary: A line of prose is the cheapest way to steer what the model writes next.
chapter: How the tool sees your code
minutes: 11
status: draft
---

## Prose as part of the program

A comment is text the model predicts from like any other, and it is the part you write with the most
freedom. A sentence describing the next function does more work than any amount of fiddling with the
code afterwards.

Consider a function that decides whether a loan can be renewed. Without a comment, the model has the
function name and the types, and it will produce something plausible for a library it has never seen.
With a comment, it has the rule:

```ts
// A loan renews when no other member is waiting and the member has fewer than three loans out.
export function canRenew(catalogue: Catalogue, loanId: number, member: string): boolean
```

The signature says the shape of the answer. The comment says what the answer means, including the two
conditions a reader of the function name alone would have to guess at.

## Writing the comment first

The habit worth taking from this is to write the comment before the body, the way you would write the
name of a function before you knew how to implement it. The comment becomes the specification you were
going to hold in your head anyway, and the completion has something to satisfy.

Three things make a comment useful to the model:

- Name the inputs it should use, especially when the signature does not mention them.
- State the rule, including the boundary, as in "fewer than three" rather than "a few".
- Say what happens on the other path, since the failure case is the one a continuation tends to skip.

## Comments that do not help

A comment restating the name adds nothing. `// Get the book` above `getBook` is text the model would
have predicted anyway. The same is true of a comment describing the language rather than the problem,
such as `// Loop over the books`. Both are fine as documentation for a reader and useless as steering.

## When the comment is not enough

If the completion still misses, the rule in the comment is usually the part that was ambiguous, and
the fix is in the comment rather than in the code below it. Sharpen the sentence and ask again. This
loop of sharpening prose is faster than editing a wrong body into a right one.

## Check yourself

Take a function in your repository whose rules are not obvious from its name, and write a one-line
comment above it that states the rule and its boundary. Then delete the function body and let the tool
write it again. Compare the new body with what you deleted and decide which reads better.
