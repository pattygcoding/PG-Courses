---
title: Your first task
summary: A small change from start to finish, to see the loop work before trusting it with more.
chapter: Setting it up
minutes: 13
status: draft
---

## The task

A first task should be small, real and checkable. Adding a function to a file, with a test, is the
right size. It exercises the whole loop: search, read, edit, run.

Run it on a repository you can throw away, or on a branch you do not mind deleting.

## The request

State the outcome, the constraint and the check:

```text
Add a renew function to loans.ts that takes a catalogue, a book id, a member and a new due date, and
returns the catalogue with that member's loan extended. Add a test beside the existing ones and run
the test file with node --experimental-strip-types --test.
```

Three parts, and each does work. The outcome says what to build. The constraint says where it goes and
in whose style. The check says how the agent will know it is done, which is also how you will know.

## Watching it work

In plan mode the agent reads the file and then states the plan. Approve it, switch to act mode, and
watch the tool calls. The call to look for is the first one after the edit: whether it ran the test,
and whether it read the failure rather than declaring success.

An agent that runs the check and reports the failure is more useful than one that runs nothing and
reports success, and the difference shows in the tool call list rather than in the summary.

## What to check before keeping it

Four things, and they take a minute.

- The diff, read rather than skimmed.
- The test, and whether it would fail if the function were wrong.
- Any file the agent touched that the task did not mention.
- Whether the new code uses the same failure shape as the functions beside it.

## Check yourself

Run the task above on a scratch branch. Then break the new function deliberately, run the test, and
note whether it fails. If it does not, write the test that does.
