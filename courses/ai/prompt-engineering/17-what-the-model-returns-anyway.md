---
title: What the model returns anyway
summary: Four real shapes, and what an extractor has to handle.
chapter: Structure
minutes: 12
status: draft
---

## The request is not a guarantee

An instruction to return one JSON object and nothing else is honoured most of the time. The rest of the time the
answer arrives wrapped, prefaced or fenced, and the extractor is what absorbs the difference.

Six shapes, run through the extractor written for this course:

```text
  bare JSON                parsed and valid
  a fenced block           parsed and valid
  prose before and after   parsed and valid
  a brace inside a string  parsed and valid
  prose only               no JSON found
  truncated JSON           no JSON found
```

Four of the six are handled, and the last two are failures the caller has to see rather than swallow.

## Why the fenced case matters

The fenced block is the commonest deviation, because an editor or a chat interface may add the fence rather than
the model. A parser that only accepts a bare object fails on a response that was correct in every way the prompt
asked for.

## Why the brace case matters

The fourth row is what separates a careful extractor from a regular expression. A naive scan for the first `{`
and the last `}` breaks when a value contains braces, and a JSON value holding a SQL literal or a template
string does exactly that.

An extractor that tracks string state and escapes finds the right boundary. That is thirty lines and it removes
a class of production failure.

## The two failures

The last two rows are real failures and both must surface. Prose with no JSON means the prompt was not followed.
Truncated JSON means the answer hit a token limit, which is a configuration problem rather than a prompt
problem, and worth distinguishing in the error you raise.

## Check yourself

Run your own responses through the four acceptable shapes and note which of them your parser rejects. Then
construct a response whose value contains a brace and check that your parser still finds the object.
