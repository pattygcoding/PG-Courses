---
title: The tool call
summary: When the answer needs something computed or looked up.
chapter: What a prompt cannot fix
minutes: 12
status: draft
---

## The class of task

Some answers need something a model cannot do. A current value. A calculation over many numbers. A reading from
a system it cannot reach. Where the task is one of those, the prompt is being asked to guess, and it will.

The signal is an answer that is right in shape and unverifiable in content. A count of rows in a table, an
exchange rate, the number of days between two dates.

## What a tool call adds

A tool call moves the work to code that can do it, and the prompt's job changes from producing the value to
producing the request. Two things follow.

- The value is computed rather than generated, so it can be checked at the source.
- The description of the tool becomes part of the specification, which is the discipline from the rules
  chapter applied to a different artefact.

## The schema is the specification

A tool's description and schema are read by the model, so they need the same care as a prompt line. Three
points, and each changes behaviour.

- Say what the tool does in one sentence, in the terms of the domain.
- Say what each argument means and what it does not accept.
- Set `additionalProperties: false`, so an argument typo is an error rather than a silent default.

The agents course in this section covers the loop around the call. The point here is narrower: where an answer
depends on a computed value, a prompt is the wrong place to ask for it.

## What stays in the prompt

Everything about which tool to use and when. A prompt reading "use the catalogue tool for any count" is doing
specification work, and it is the part a model cannot infer from a schema alone.

## Check yourself

Take one answer you cannot verify and say whether it needed a lookup, a calculation or a fact. Then write the
tool description and schema that would move that work out of the prompt.
