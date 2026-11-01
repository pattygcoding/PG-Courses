---
title: A task bigger than the window
summary: What happens when the work does not fit, and how to keep the model's picture accurate.
chapter: Context
minutes: 12
status: draft
---

## The window is finite

Everything the agent has seen in a task sits in one conversation: the files it read, the commands it
ran, the edits it made and its own reasoning. That conversation has a size limit, and a task that runs
long enough approaches it.

What happens at the limit depends on the product. Older turns are dropped, or summarised, or the task
stops. All three produce the same symptom, which is an agent that has forgotten a decision it made
earlier in the same task.

## The symptom to recognise

Three signs that the picture has drifted.

- It revisits a decision already made, and makes it differently the second time.
- It edits a file it has already changed, undoing part of that change.
- It asks for a file it read twenty steps earlier, or refers to a function by the wrong name.

Each one is a signal to split the task rather than to keep going with a longer instruction.

## Keeping the picture small

The cheapest technique is a smaller task. One file, one function, one endpoint. A task with a narrow
boundary reads less, remembers less and finishes in fewer steps, so every part of the window goes
further.

Three supporting habits help as well.

- Start a fresh conversation per task rather than per afternoon.
- Close the agent's own scratch files, since its notes occupy the same window as the code.
- Keep the rules file short, because it is added to every task and counted every time.

## When the change truly is large

Some changes span many files and cannot be narrowed. Those go in a sequence, with a commit between the
steps, so each task starts from a repository that already holds the previous result. The agent then
reads the current state instead of reconstructing it, which is cheaper and more accurate than a long
conversation about a plan.

## Check yourself

Take a change that spans more than three files and split it into a sequence where each step can be
committed. Run the first step in a fresh conversation, commit it, then run the second. Note how many
files the second step had to read.
