---
title: Asking a question about code
summary: Selecting the lines that matter beats asking about a file the panel has never seen.
chapter: Chat and edits
minutes: 11
status: draft
---

## The question and the context

The chat panel answers a question from what you give it. Ask with nothing attached and the answer
comes from the model's training, which is generic. Select the twenty lines you are confused by and the
answer is about those lines.

That is the whole technique. The common failure is asking about a file that was never attached, then
judging the answer as though the panel had read it.

## Questions worth asking

Three kinds earn a place in a working day.

- Explain this. Select a block you have inherited and ask what it does. The answer is a draft you can
  check against the code, which is quicker than reading it line by line when what you need is
  orientation.
- What breaks this. Select a function and ask for the inputs that fail. The answer is a list of
  hypotheses, and each one is cheap to test.
- How do I call this. Select a signature from a library you do not know and ask for a call site. The
  answer is usually right for the version in the training set, which is the part to verify.

## Questions that waste the panel

Two kinds are worth avoiding. A question whose answer is a search away in your own repository, such as
where a value is set, because a text search is exact and instant. And a question about your own rules,
because the model has never seen your schema or your policy, and an answer that reads confidently is
still a guess about how libraries usually work.

## Reading an explanation against the code

When the panel explains a block, read the explanation with the code in front of you and ask one
question: does the code do what the sentence says? Explanations written from the code tend to describe
the happy path and skip the guard clauses, and the guard clauses are often the reason the block exists.

## Check yourself

Pick a function you have never read closely. Select it, ask the panel to explain it, and write the
explanation out in your own words. Then add a test for the branch the explanation did not mention. If
you cannot find such a branch, note that as the answer instead.
