---
title: What Copilot is
summary: A model that predicts the next piece of code from what is already in front of it.
chapter: How the tool sees your code
minutes: 10
status: draft
---

## The shape of the feature

Copilot predicts the next piece of text from the text already around your cursor. In the editor that
prediction arrives as grey text you can accept or ignore. In the chat panel the same model answers a
question with whatever context was attached to it.

One sentence explains most of the behaviour. The prediction is a continuation, so it fits whatever
pattern it can see: the loop you are halfway through, the shape of the three test cases above, the
route handler that looks like the previous six.

## Where the prediction is strong

A language model is trained on an enormous amount of code, so it is at its best on code that looks
like a great deal of other code. Boilerplate is where this shows most:

```ts
export interface Book {
  readonly id: number
  readonly title: string
  readonly copies: number
}
```

Once the first field is typed, the rest of that interface is close to free. The same is true of a
`switch` over a known set of values, a mapping table, a constructor that assigns its parameters, and
the fifth test case in a file where four already exist.

## What the prediction has not checked

Nothing in a completion is verified against your project. A function name that appears because it
reads well is a name the model produced, and whether that function exists is your compiler's business.
The same applies to a package that does not exist, a configuration key that was removed two versions
ago, and a field on an object that was renamed last week.

This is the part worth internalising before the keys become muscle memory. The suggestion arrives in
the style of your file, which is the same style as your correct code, so it carries none of the
signals a person's uncertainty would carry.

## The two places it appears

There is the inline suggestion, which completes what you are writing, and the chat panel, which
answers a question or proposes an edit. They share a model and differ in what they are given. An
inline suggestion sees your file and the tabs around it. A chat question sees what you attach to it,
which is why the same question asked in an empty panel and asked with a file selected produces
different answers.

The rest of this chapter is about that difference, because the context is the part you control.

## Check yourself

Open a file you know well and let Copilot offer a suggestion. Do not accept it. Write down the name or
the call you would have written yourself and compare it with the grey text. Where the two differ, work
out which one the conventions in that file actually point to.
