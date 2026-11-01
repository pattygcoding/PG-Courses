---
title: Placeholders
summary: A prompt is a template, and the substitution has to be obvious.
chapter: Examples and delimiters
minutes: 11
status: draft
---

## The prompt is a file

A prompt you send once can live in your head. A prompt you send a thousand times is a file with inputs, and
the inputs have to be marked so they cannot be confused with the prompt's own text.

The prompts here use `{{name}}`:

```text
Description:
{{description}}
```

Two braces on each side, which nothing else in a prompt uses, and no space inside, so a search for `{{` finds
every substitution point.

## The two substitution failures

Both come from the substitution rather than from the model. A placeholder that is never filled, so the model
is asked about the literal text `{{diff}}`. And a value containing a brace sequence that looks like another
placeholder, which is possible when the input is generated.

Both are caught by a test rather than by care. Render the prompt with a sample value and assert that no `{{`
remains.

## Where the values come from

Four sources, and they differ in how much you should trust them. Data from your own database. The user's
request. A value from configuration. And the model's own earlier output, which is the one people trust too
much, because it is the one that can carry instruction-shaped text from somewhere else.

The delimiter is what protects the last two. A value you would not paste into your own terminal deserves a
fence in the prompt.

## Placeholders against the example

The example's values are literal rather than placeholders, and that is deliberate. An example full of
placeholders demonstrates the substitution rather than the shape, which is why the migration example uses a
real table name and a real column.

## Check yourself

Turn one prompt into a template with named placeholders, then write the one-line test that renders it with a
sample value and asserts that no placeholder remains. Run it against an input containing `{{`.
