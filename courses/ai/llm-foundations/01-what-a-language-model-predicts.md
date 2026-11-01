---
title: What a language model predicts
summary: One function, and everything an assistant does that follows from it.
chapter: Tokens
minutes: 11
status: draft
---

## The whole model in one sentence

A language model takes a sequence of tokens and returns a probability for every token in its vocabulary
as the next one. That is the entire interface. Everything else an assistant appears to do is built on
top of it: the code it writes, the explanation you asked for, the tool call it forms.

The rest of this course is about the pieces of that sentence. What a token is, how the probabilities come
out, how they are turned into one choice, and where the machinery was trained.

## What one prediction looks like

Ask a model for one token and the answer is a list of candidates with weights. Tracing through a small
model built for this course, the context `the librarian` produces:

```text
next tokens after "the librarian":
  renewed    count-derived logit 1.386
  .          count-derived logit 1.386
  checked    count-derived logit 0.693
```

Three candidates, two of them twice as likely as the third. The model has no plan beyond the next token,
and nothing in it knows what a librarian is.

## What the loop adds

Generation is that prediction repeated. Each chosen token is appended to the sequence and the model is
asked again, which is why one step is cheap and a long answer is not. From `the librarian` the loop
produces, one token at a time:

```text
the librarian renewed the loan for the reader . the librarian renewed the loan for the
```

That came from a model looking two words back over a corpus of thirteen sentences, so it repeats itself
and loses the thread. A large model runs the same arithmetic with a context of thousands of tokens and a
vocabulary of a hundred thousand, which is the difference between the toy and the tool.

## Why the sentence matters to you

Three practical facts follow from it, and each comes back in a later chapter.

- The output is a distribution rather than a fact. Nothing in the model marks a candidate as true.
- The context is the whole of its memory for this call. It cannot read the file you did not attach.
- The cost scales with tokens rather than with sentences, so the bill comes from the count.

## Check yourself

Take a sentence from your project and write it twice, once as it stands and once with one word replaced
by a synonym. Count the tokens in both. Write down which version a model would find easier to predict,
and why you think so.
