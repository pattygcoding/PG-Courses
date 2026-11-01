---
title: The rules file
summary: The instructions file the agent reads on every task, and what belongs in it.
chapter: Context
minutes: 12
status: draft
---

## A file added to every task

Agents look for a rules file in the repository, usually at the root or inside a dot directory, and add
its contents to the prompt. The name differs between products and the mechanism does not: text
committed to the repository is available to every task, without you typing it again.

That makes it the right place for the constraints you would otherwise repeat, and the wrong place for
anything that changes daily.

## What earns a line

Five kinds of statement change the outcome most often.

- The layout. Where handlers go, where tests go, where a new module belongs.
- The commands. How to run the tests, the type check and the build, exactly as you run them.
- The conventions that are not universal. The failure shape, whether comments are expected, whether
  the project reaches for classes or plain functions.
- The prohibitions. Generated files, vendored directories, migrations that are never edited.
- The boundaries. Paths that must not be read, and what to do instead.

## What to leave out

Anything the agent can read for itself. A paragraph describing the framework is space that pushes the
useful rules out of the window. So is a rule nobody enforces, because a file of aspirational notes is a
file the team stops reading.

Keep it short enough that you would read it in a review. Twenty lines that matter beat a hundred that
do not.

## Keeping it true

The file is code. It changes when the conventions change, it is reviewed, and a stale version is worse
than no file at all, because the wrong answer now arrives with authority. When a task produces a change
in the wrong place, the fix belongs in this file rather than in the next prompt.

## Check yourself

Write a rules file for your repository in twenty lines or fewer, covering the layout, the commands and
one prohibition. Then run a task that one of those lines should affect, and check whether the plan
respects it.
