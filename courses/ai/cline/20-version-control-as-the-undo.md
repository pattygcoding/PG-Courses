---
title: Version control as the undo
summary: The commit that makes an agent's work reversible.
chapter: The terminal and the filesystem
minutes: 12
status: draft
---

## The rule that makes the rest safe

Everything in this chapter assumes one thing: the work an agent does sits inside a repository whose
history you can return to. Where that holds, a bad change costs one command. Where it does not, a bad
change costs the afternoon.

So the rule is a commit before the agent starts, and a small commit after each step it finishes.

## The three commands

```bash
git status --short
git diff
git restore .
```

The first shows which files changed, and it is the fastest way to see that the agent touched something
unexpected. The second shows the change itself. The third returns every tracked file to the last commit,
which is the whole undo.

In a scratch repository where an agent added a function to one file and left a scratch file of its own,
the status reads:

```text
 M loans.test.ts
 M loans.ts
?? debug.log
```

Two tracked files and one untracked. After `git restore .` the tracked pair is back at the last commit
and the status prints nothing at all. `debug.log` is still there, because it was never tracked, which is
the distinction from the earlier lesson about the stop.

## Committing each step

A sequence of small commits survives a mistake at the end of it, and one large commit does not. When the
fourth step of six goes wrong, the first three are already in history, and the revert takes you back one
step rather than to the start.

The message matters less than the boundary. One commit per finished step, placed where you would want to
stop.

## Without version control

Where the project is not in a repository, two substitutes are worth the trouble. Copy the directory
before a task, or put the project in a repository even if you never push it. A directory copy is crude
and it is enough to recover from the class of mistake that deletes rather than edits.

## Check yourself

Commit your working tree, run a task, then practise the undo: `git status --short`, `git diff`, and
`git restore .`. Note whether anything the agent created survived the restore, and write down how you
would remove it.
