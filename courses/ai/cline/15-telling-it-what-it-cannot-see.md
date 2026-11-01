---
title: Telling it what it cannot see
summary: Documentation, logs and database rows the agent has no way to reach.
chapter: Context
minutes: 12
status: draft
---

## The edges of what it can reach

The agent reads the filesystem and runs commands. Everything else is out of reach: the ticket, the
review comment, the customer's message, the production log, the schema in a database it cannot connect
to.

Where a task depends on one of those, the dependency has to be supplied. An agent that is missing it
will substitute a guess, and the guess will be plausible.

## Putting text in front of it

The straightforward answer is to paste the text into the task. Two rules make that useful.

- Paste the part that matters. A whole log file pushes the code out of the window, and the useful line
  may be one of four.
- Say what it is. "This is the failing output from the production run at 09:14" is a different thing
  from an unattributed block, and it tells the agent how much to trust it.

## Putting it where it can read

When the material is needed on more than one task, write it into the repository. A schema dump in a
documented location, an example response body in a fixture, an architecture note beside the code it
describes. Committed text is read on every task, and it can be reviewed like anything else.

That is also the answer for the boundaries in the rules file. A path the agent must not read is a path
it should not need, so the material belongs somewhere else in the repository.

## When the material is a secret

Production logs and customer records are not things to paste into a model call. Extract the shape rather
than the content: the field names, the status code, the error class, with the values replaced. That is
usually everything the task needs, and it is the difference between a task you can run and one you
cannot.

## Check yourself

Take a task that depended on something outside the repository. Write down what you supplied, what you
could have committed instead, and which fields you could have extracted while leaving the values behind.
