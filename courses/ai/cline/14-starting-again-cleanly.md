---
title: Starting again cleanly
summary: When to abandon a conversation, and what to carry into the next one.
chapter: Context
minutes: 11
status: draft
---

## Conversations carry their mistakes

A conversation accumulates wrong assumptions along with context. An early guess about where the code
lives stays in the window, and a later step may reason from it even after that guess has been shown to
be wrong.

Continuing to argue with a conversation in that state is slow. Reverting and starting again with a
better task statement is usually faster, because the second attempt starts from the same repository with
a more accurate description of it.

## The signal to stop

Three signs, and any one of them is enough.

- Two consecutive corrections of the same misunderstanding.
- A plan that names files you have already said do not hold that code.
- An edit that reintroduces something you reverted a step earlier.

At that point the conversation is the problem rather than the model, and a fresh one is the fix.

## What to carry over

Nothing from the conversation, and everything from the repository. Before starting again, make sure the
working tree says what you want the new task to assume.

```bash
git status --short
git restore .
```

The first command shows what the abandoned attempt left behind. The second returns the tracked files to
the last commit, which is the state a new conversation should read.

## Starting again with a better task

A second attempt succeeds more often when the task statement has changed in a specific way. Add the file
to imitate. Add the prohibition that was ignored. Name the check command. Those three cover most
repeated misunderstandings, and they are the same three parts described in the earlier lesson.

## Check yourself

Take a conversation that has gone wrong, note the misunderstanding it keeps repeating, and revert the
working tree. Then write the task statement again with one added constraint and run it in a fresh
conversation. Compare the two plans.
