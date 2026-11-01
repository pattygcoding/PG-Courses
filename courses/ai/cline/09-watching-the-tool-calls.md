---
title: Watching the tool calls
summary: The list of calls is the record of what actually happened.
chapter: The working loop
minutes: 12
status: draft
---

## The summary is not the evidence

An agent finishes with a summary, and the summary is written by the same model that did the work. The
record you can check is the list of tool calls: which files were read, which were written, and which
commands ran.

That list is where you find out whether the task was verified or merely declared finished.

## What a list looks like

The lines below are a real task in a scratch repository, and each one was a step I ran while writing
this course:

```text
read_file     loans.ts
edit_file     loans.ts                      +18 lines
command       node --experimental-strip-types --test
command       git status --short
command       git diff --stat
```

Five lines carry the whole story. The file was read before it was edited. The edit was 18 lines. The
test ran before the diff was read, which is the order that matters.

## The calls that are missing

Two absences are worth looking for. If the target file is never read before an edit, the agent was
working from its own idea of the file rather than from the file. If no command appears, nothing was
verified, whatever the summary says.

```text
read_file     loans.ts
edit_file     loans.ts                      +18 lines
```

That shorter list is the same task with the check left out, and the diff it produced was green against
a suite that never touched the new function. Reading the list takes a minute. Skipping it means
reviewing a change whose author did not run it.

## Read commands for their arguments

Commands deserve a close read, because they are the steps that can do damage. A test command with a path
runs one file. The same command without the path runs the whole suite, which may take minutes or reach
the network. A `git` command with `-f` deletes rather than reports, and the difference is one character.

## Check yourself

Run a task and read the tool call list before reading the summary. Write down whether the target file
was read first, whether any command ran, and which call you would have refused had you seen it
beforehand.
