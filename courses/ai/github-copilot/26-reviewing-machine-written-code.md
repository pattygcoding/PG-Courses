---
title: Reviewing machine-written code
summary: The review you owe a change nobody remembers writing.
chapter: Working practice
minutes: 12
status: draft
---

## What is different

Reviewing a colleague's change differs from reviewing a generated one in one way. The colleague can
answer a question, and the answer is evidence. Here there is nobody to ask, so the code is the whole of
the evidence, and the code is often arranged to look correct.

That makes the review slower rather than harder. The methods are the ones already in use, applied
without the shortcut of asking what someone intended.

## Three questions

Three questions find most of what matters.

- Does it do what the ticket asked. Which is a question about the code and not about the description on
  the pull request, since the description was often written from the code.
- Does it do anything the ticket did not ask. Files touched, configuration changed, a helper refactored
  on the way past.
- What does it do when the input is wrong. The hardest branch to write is the least likely to be
  exercised, and it is where generated code fails most often.

## Verification over reading

Two reviews of the same diff: one read closely, one run against a failing case written first. The
second finds more. Writing the failing test before reading the implementation reverses the order that
produced the gap, and it works because a test names a behaviour while a reading names a suspicion.

## Language and provenance

Two smaller checks belong in the review as well. The wording in comments and messages tends to carry
the voice of a model rather than the voice of the codebase, and a comment restating the line beneath it
is worth deleting rather than rewriting. And a large block that looks like a whole function from
somewhere else deserves the question of where it came from, which the next lesson covers.

## Check yourself

Take a generated change and write the three questions at the top of the review. Answer each with a line
number or a command you ran, rather than an impression. Then compare that review with what you would
have written after reading the diff once.
