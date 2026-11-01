---
title: Reading the plan
summary: What the plan is telling you about the model's picture of the repository.
chapter: The working loop
minutes: 11
status: draft
---

## The plan as a set of claims

A plan is a list of claims about your repository. Each file it names is a claim that the change belongs
there. Each step is a claim that the step is necessary. Read it that way and the mistakes are easy to
see.

Four claims to check, in order.

- The files. Are these the files that hold the code, and is anything missing?
- The order. Does a later step assume something an earlier step has not created?
- The boundary. Does it propose changing something the task did not mention?
- The check. Does it say how the result will be verified?

## The missing file

The most common defect is a file that never appears. A handler is named but not the module exporting the
type it needs, or a test file is named but not the fixture it imports. That usually means the agent
searched for one thing and reasoned about another.

Asking why a file is absent is a cheap question and it improves the plan. The agent either justifies
the omission or adds the file.

## The plan that grows

The other defect is scope. A task to add one function turns into a plan that also renames two helpers
and upgrades a dependency. Some of that may be real, and it belongs in a second task and a second
commit, so the change under review stays the change that was asked for.

## The plan that cannot be wrong

A plan made of vague steps, such as "update the code to handle the new case", cannot be checked and so
cannot be corrected. Ask for file names and an order. A plan that names no file is a restatement of the
task.

## Check yourself

Take a plan the agent produced and mark every step as a claim. For each file, write down why the change
belongs there. Any step you cannot answer for is a question to ask before approving.
