---
title: When examples mislead
summary: The ways a demonstration pulls the answer in the wrong direction.
chapter: Examples and delimiters
minutes: 12
status: draft
---

## The example becomes the answer

The commonest failure is an example too close to the input. Ask for a migration with an example about adding
a column, then send a request about dropping a table, and part of the answer may keep the column-adding
shape.

The signal is output that is right about the format and wrong about the operation, which is worse than a
plain format failure because it validates.

## Four causes

- An example whose content overlaps the input's content.
- An example longer than the input, so it dominates the prompt.
- Several examples that agree with each other and disagree with this input.
- An example in a different language, framework or dialect from the input.

The fourth is easy to miss, because the shape transfers and the dialect does not. A Postgres example above a
MySQL input produces Postgres.

## Fixing it

Three moves, in order of cost.

- Make the example about something unrelated, so the shape transfers and the content cannot.
- Shorten it, so it cannot dominate.
- Keep it after the rules and before the input, where it reads as an illustration rather than a template.

The migration prompt's example is about `books.isbn`, unrelated to every case in the suite, and that is on
purpose.

## When to drop the example

Where the task is narrow and the shape is short, rules alone can be clearer. An example earns its lines when
the shape is not obvious from a description. Where the shape is a single value, one line of instruction is
enough and the example is a place for content to leak in.

## Check yourself

Take a prompt with an example and send it an input from a different category. Note which parts of the example
appear in the answer anyway, then rewrite the example so its content cannot overlap any real input.
