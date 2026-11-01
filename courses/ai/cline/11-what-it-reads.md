---
title: What it reads
summary: The agent chooses its own reading, which is why the plan is the first place to check it.
chapter: Context
minutes: 12
status: draft
---

## Reading is a decision the agent makes

A completion sees the file you are in. An agent decides which files to open, which is a larger freedom
and a larger source of error. It searches, reads what the search returned, and reasons from that.

So the question of whether it saw the right code has no fixed answer. It depends on what the search
turned up, and the search depends on the words in your task.

## How the reading usually goes

Three steps cover most of it. A search for a name or a phrase from the task. A read of the files the
search returned, often a range rather than the whole file. Then a read of the neighbours, meaning the
imports and the tests of the files already open.

That third step is what gets the conventions right, because the test of a handler shows how this
project tests a handler.

## Where it goes wrong

Two failures are common. A search that matches nothing, because your code uses a different word from
the one in your task, so the agent proceeds without the file that mattered. And a read that is too
narrow, because it opened a range around one function and missed the helper two hundred lines above it.

Both failures look the same in the summary. Both are visible in the tool call list, which is one more
reason to read that list.

## Steering the reading

Four things put the right files in front of the agent, and all four are cheap.

- Use the words the code uses, taken from file names and type names.
- Name a file to imitate when the conventions matter.
- Name a file that must not be touched when the change is narrow.
- Ask which files it has read when the plan looks thin.

## Check yourself

Ask the agent to describe how your repository reports a failure, without naming a file. Then check how
many files it read and whether the description matches the code. Write down the search terms you would
have needed to supply.
