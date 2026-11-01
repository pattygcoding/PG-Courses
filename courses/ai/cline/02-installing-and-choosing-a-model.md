---
title: Installing and choosing a model
summary: The extension, the provider behind it, and what the choice of model changes.
chapter: Setting it up
minutes: 12
status: draft
---

## Two decisions

Installing the extension is the easy part. The decision that shapes everything after it is which model
sits behind the loop, because the model decides how well the plan is drawn, how carefully a tool call
is formed, and how much of the repository it can hold in view at once.

Most agents let you point at a hosted provider, at a local model, or at both. That is a trade between
capability, latency and where your code goes, and the course on running models locally covers the last
of those in detail.

## What the model changes

Four things move with the model. The rest of the interface stays the same.

- The quality of the plan. A strong model names the right files. A weak one guesses from the file you
  mentioned.
- Whether it forms valid tool calls. A weaker model produces arguments that do not match the schema,
  and the loop spends steps repairing them.
- How much context it holds. This decides whether a change across five files survives one
  conversation.
- How often it asks for something it should not. Auto-approving a weak model's commands is a different
  risk from auto-approving a careful one.

## A starting configuration

Set the agent up so that approval is required for anything that writes or runs, and turn the extra
freedom on later, per project, once you have seen what it does. Approvals are cheap and they are the
last place a loop can be stopped before it acts.

Two more settings are worth finding on the first day: the one that decides whether files outside the
project may be read, and the one that caps how many steps a task may take.

## Changing models later

Switching provider mid-project is normal, and what changes is the plan rather than the interface. A
conversation that produced a good plan on one model can produce a vague one on another, and the fix is
a sharper task statement rather than a longer conversation.

## Check yourself

Configure two models, one hosted and one local, and run the same small task through both. Write down
which files each one read, how many steps it took, and whether either asked for a command you would not
have approved.
