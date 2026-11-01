---
title: Inline chat and selected code
summary: Working on a selection, where the answer replaces code instead of describing it.
chapter: Chat and edits
minutes: 11
status: draft
---

## A selection is the unit of work

Inline chat takes the selected range as its subject and offers to change it. The result is code rather
than prose, and code has to be read rather than judged by how sensible it sounds.

The commands most editors provide cover explanation, tests, documentation and a fix. Each has a scope.
A fix applies to the selection, an explanation describes the selection, and the tests it writes belong
beside the file rather than inside it.

```text
/fix        change the selection so it does the intended thing
/explain    describe the selection
/doc        write a doc comment for the selection
/tests      write tests for the selection
```

Command names differ between editors. What the set has in common is the range, which is why a small
selection answers better than a large one.

## Selecting well

Select a whole function and the answer is about the function. Select half of it and the answer is about
half, which is rarely what you want. Select several ranges at once and the result is unpredictable.

The useful discipline is to select the smallest unit that has a name: a function, a class, a method.
That is also the unit you can test afterwards, which is what makes the change reviewable.

## Best used for wide, shallow edits

Inline chat is strongest where the change is broad and mechanical. Renaming a parameter through a
function. Turning a loop into a method chain. Adding a doc comment in the house style. Adding a guard
clause and the return that goes with it.

It is weakest where the change depends on something outside the selection. Asking it to handle a new
failure while the type of that failure lives in another file produces code that compiles in isolation
and does not fit the project.

## Reading the result

An edit here replaces text in your working tree, so a mistake is a mistake in the repository rather
than in a suggestion you can decline. Run the tests before moving on, even when the change looks
trivial. The habit costs seconds and it is what separates using this feature from being caught out by
it.

## Check yourself

Select one method and ask for a doc comment. Read it against the body and correct anything it claimed
that the code does not do. Then select the same method, ask for tests, and run them. Note whether they
pass for the reason the doc comment gave.
