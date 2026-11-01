---
title: Writing the fifth similar block
summary: Pattern completion is the strongest case and the one that needs the most attention.
chapter: Completions
minutes: 11
status: draft
---

## The strongest case

The most reliable place for a completion is also the most dangerous. When a file holds four similar
blocks, the fifth is close to a copy, and the model produces it accurately and fast. Volume like that
is where a wrong block hides, because nobody reads the fifth entry of a list they skimmed the first
four of.

```ts
const routes = [
  { method: 'GET', path: '/books', handler: listBooks },
  { method: 'GET', path: '/books/:id', handler: readBook },
  { method: 'POST', path: '/loans', handler: placeLoan },
  { method: 'DELETE', path: '/loans/:id', handler: endLoan },
]
```

## Where the copy goes wrong

A block written by analogy fails in predictable ways. A path copied from the entry above that should
have been different. A handler that reads a parameter the route does not provide. A status code that
belongs to the previous entry. A test that asserts the behaviour of the block above it.

The cause is structural. The model continues the pattern it can see, and a pattern in a list does not
say which entry is the exception. When four entries follow one rule and the fifth does not, the fifth
is the one to type yourself.

## Reading a generated list

Read a generated list the way you would read one written by someone who had not seen the ticket. Every
entry, not the first two. The identifiers that must be unique. The numbers and strings, checking that
each belongs to its own entry rather than the one above.

When the structure is countable, write the check down. If every entry must have a distinct path, a
test asserting uniqueness turns that class of mistake into a failing build instead of a review habit.

## The signal about structure

A long run of similar blocks is also a sign that the structure wants changing. If the entries differ
only in a value, they belong in data rather than code, and the completion is showing you a shape that
invites mistakes. Refactor before the sixth entry arrives.

## Check yourself

Find a list or a set of similar blocks in your repository and ask for one more entry. Check every
field of the new entry against the entries above it. Then write a one-line assertion that fails when
two entries share a key, and run it against the generated entry and against a correct one.
