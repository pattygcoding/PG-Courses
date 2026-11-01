---
title: Stopping it partway
summary: The stop button, the revert, and why the working tree is the thing to protect.
chapter: The working loop
minutes: 12
status: draft
---

## Three ways a task ends

A running task stops in one of three ways. You stop it, the agent stops itself, or a limit stops it.

Stopping it yourself is the one worth being good at, because it happens while something is going wrong.
The control sits where you started the task, and it takes effect at the next step boundary, so a command
that has already started will finish.

## What the stop leaves behind

A stopped task leaves the working tree exactly as the last step left it, which can be half a change.

```bash
git status --short
```

```text
 M loans.test.ts
 M loans.ts
?? debug.log
```

Two edited files and one stray file the agent created while working. Knowing this state is what makes a
stop safe, because it is recoverable in one command.

## Reverting a stopped task

```bash
git restore .
```

```text
(no changes)
```

That returns every tracked file to the last commit, and a `git status --short` afterwards prints
nothing at all. The stray file is untracked, so it survives the restore and has to be deleted by hand.
That distinction is worth knowing before you need it, since the command that lists untracked files is
one flag away from the command that deletes them.

## Limits that stop it for you

Two limits are worth setting on purpose. A cap on the number of steps, which bounds how long a confused
loop can run. And a cap on cost or tokens, where the provider charges per call, which bounds the bill
rather than the time.

Both live in the agent's configuration rather than in the repository, and both produce a stop that looks
like a failure. A task that hit the cap has not failed. It ran out of the budget you gave it, and the
useful response is to narrow the task rather than to raise the limit.

## Check yourself

Start a task you expect to be too big, stop it after the third tool call, and inspect the working tree
with `git status --short`. Write down what it contained at the moment you stopped, then revert with
`git restore .` and confirm the tree is clean.
