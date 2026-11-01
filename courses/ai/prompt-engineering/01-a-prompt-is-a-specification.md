---
title: A prompt is a specification
summary: The model cannot ask a clarifying question, so every ambiguity becomes a guess.
chapter: The shape of an instruction
minutes: 11
status: draft
---

## The comparison

A prompt is a specification written for a reader who cannot ask a question. Every ambiguity you leave gets
resolved by the model, and the resolution follows the most common pattern in its training data rather than
your intent.

That framing is worth having because it turns a vague feeling into a list. When output varies between runs,
or when it is right about the shape and wrong about the content, the question becomes which part of the
specification was missing.

## What a missing specification looks like

A short prompt and what came back, from the suite built for this course:

```text
Turn this description into a database migration.

add a column borrowers.email of type text, not null
```

The response explained what to run and gave one statement. It was useful and it did not fit the shape the
caller needed, so the case failed with `no JSON object in the response`. The model was not wrong about the
work. The specification said nothing about a format.

## The four parts

Four parts cover most of what a prompt needs, and they are the shape of this chapter.

- The job. What is true when the call has succeeded.
- The constraints. What to use, what to avoid, what must not change.
- The output format. The shape the caller will parse.
- An example or a set of cases, which the next chapter covers.

## Why writing it down pays

A specification can be tested and a feeling cannot. Once the parts are written, two prompts can be compared
over a fixed set of inputs, which is what the iteration chapter does with the numbers `1/9` and `8/9` from
this suite.

## Check yourself

Take a prompt you use and label each sentence as job, constraint, format or commentary. Any sentence you
cannot label is a candidate for deletion, and any missing label is something the model is currently
guessing at.
