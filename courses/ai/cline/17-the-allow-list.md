---
title: The allow list
summary: The commands that never need asking, and the ones that always should.
chapter: The terminal and the filesystem
minutes: 12
status: draft
---

## Why a list rather than a switch

Auto-approving every command decides to trust a loop with a shell. Approving every command means reading
forty prompts an hour, which ends in approving without reading. A list is the middle position, and it
works because most commands in a day are the same few.

## What belongs on it

The test command for one file. The type check. `git status` and `git diff`. A search. Those are
read-only or confined to the project, and they are the commands you run constantly.

```text
node --experimental-strip-types --test
npx tsc --noEmit
git status
git diff
git log
```

Two rules for the list. Keep it short, because every entry is a command you have decided never to read
again. And keep anything that writes off it, including commands that write only sometimes.

## What must stay off it

Four groups, and the reason is the same in each case: the damage is not visible in the command line.

- Package managers. An install or an upgrade rewrites a lock file and runs code from the registry.
- Anything with `-f`, `--force` or `--hard`.
- Anything that reaches the network, because the destination can change between runs.
- Commands that delete, including the ones that delete only ignored files.

## The command that proves the point

A dry run of the clean command, in a scratch repository that holds two stray files:

```bash
git clean -ndx
```

```text
Would remove debug.log
Would remove tmp/
```

Two files that a real run would delete, and nothing that would delete them back. `debug.log` is a stray
an agent created while working. `tmp/` is a build directory. Neither is tracked by git, so neither is
recoverable from a commit, and the `-n` in that command is the only thing standing between the listing
and the deletion.

That is the shape of every dangerous command: short, ordinary, and reversible only if you thought about
it first.

## Check yourself

Write the allow list you would give an agent in your project, with no more than six entries, and then
write the list of commands that must never be auto-approved. Compare both with the command an agent
actually runs most often, and see which list it falls on.
