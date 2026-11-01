---
title: What a command can break
summary: The damage that is not a deletion, and the state that is not in a file.
chapter: The terminal and the filesystem
minutes: 12
status: draft
---

## Four kinds of damage

Deleting files is the obvious kind and the least likely. Three others come up more often.

## A rewrite that looks like an edit

A code generator or a formatter rewrites files across the repository, so the diff holds changes the task
never needed. Those are recoverable, since they are tracked, and they cost review time rather than data.
The tell is a diff with more files than the task implied.

## A dependency that moved

An install or an upgrade rewrites the lock file and changes the versions that will resolve next time.
The change gets committed by accident more often than not, and it surfaces weeks later as a build that
fails somewhere else. That is why package managers stay off the allow list.

## State outside the repository

Three examples worth naming. A database that a migration command altered, where the change is in no diff
and no commit. A cloud resource that a script created, which now exists and costs money. And a file in a
home directory, such as a cache or a global configuration, which the project does not track and cannot
restore.

Those are the ones a sandbox and version control do not cover, which is why the approval prompt matters
most for exactly these commands.

## The question that helps

Before approving a command, ask what it changes and whether that thing is in the repository. A change
inside the repository is recoverable in one command. A change outside it is a decision about your
machine, your data or your bill, and that deserves the seconds you were about to save.

## Check yourself

List the commands your project runs that touch something outside the repository. For each one, write
down how you would recover if it ran twice by mistake, and whether you would notice at all.
