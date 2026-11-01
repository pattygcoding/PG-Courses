---
title: What an agent is
summary: A model with tools, a loop and a stop condition, which is a different thing from a completion.
chapter: Setting it up
minutes: 11
status: draft
---

## Three parts

An agent is a model, a set of tools, and a loop. The model decides what to do. The tools let it read
files, search, write files and run commands. The loop feeds each result back and asks for the next
step, until the model says it is finished or something stops it.

That is the whole difference from a completion. A completion produces text and stops. An agent produces
text, acts on it, and then looks at what happened.

## What the tools are

Most agents ship with the same small set.

- Read a file, or a range of one.
- Search the repository for a string or a filename pattern.
- Write a whole file, or replace part of one.
- Run a command in a shell and read its output.

Everything an agent does is a sequence of those four. Every risk in this course comes from the last
one, because a shell runs whatever it is given.

## The loop is both the value and the risk

The value is that a result can change the next step. A test fails, so the agent reads the failure and
edits the code. A search returns nothing, so it tries a different name. A program that works this way
reads as more capable than a completion, because some of the work happened between the steps.

The risk is the same property. A loop with a shell in it can run a command that deletes something, and
it can run for a long time before anyone notices. The rest of this chapter is about the settings that
bound it, and the later chapters are about the habits.

## What the loop does not know

Nothing in the loop understands your system. The agent reasons from the text of the files it read and
the output of the commands it ran. An assumption it made in the first step is still in the conversation
at the twentieth, and nothing in the loop goes back to check it.

## Check yourself

Write down the four tool kinds, then write down the single command an agent could run in your project
that would do the most damage. Keep that answer. The allow list lesson returns to it.
