---
title: Reverting a change
summary: Undoing one step, one file or the whole task, in that order of preference.
chapter: Verification
minutes: 11
status: draft
---

## Three sizes of undo

A change you do not want comes in three sizes, and the smallest one is usually right.

- One step. `git restore` on the file that step touched, leaving the earlier steps in place.
- One file. The same command with a path, when the task touched several files and only one is wrong.
- The whole task. A reset to the commit you made before the agent started.

Reaching for the largest undo by habit throws away work that was fine. Committing each step is what keeps
the smaller options available.

## The commands

```bash
git restore loans.ts
git restore .
git reset --hard HEAD~1
```

The first returns one file to the last commit. The second returns everything tracked. The third moves the
branch back one commit, which removes the commit itself, so it belongs to the case where the commit was
the mistake.

## What a revert leaves behind

The distinction from the earlier chapter matters more here, because a review depends on it. Tracked files
come back. Untracked files do not.

```text
 M loans.test.ts
 M loans.ts
?? debug.log
```

After `git restore .` the two status lines are gone and `debug.log` is still there. A generated file, a
fixture the agent created, or a stray script survives every restore, and a stale one left in the tree
changes what the next task reads.

## Checking that the undo worked

```bash
git status --short
git diff --stat
```

Both print nothing when the tree matches the last commit. That is a stronger statement than reading the
code again, because it is a comparison rather than a judgement, and it takes a second.

## Check yourself

Make three small commits, then revert only the middle one with `git restore` on the files it touched.
Confirm with `git status --short` that the tree matches what you expected, then find one untracked file
the task created and delete it by hand.
