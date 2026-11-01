---
title: The sandbox
summary: Containment, and what it does and does not protect.
chapter: The terminal and the filesystem
minutes: 12
status: draft
---

## What containment means

A sandbox limits what a command can reach: which directories it can read and write, whether it has a
network, and which environment variables it inherits. An agent's version of this is usually a set of
settings rather than a container, so the strength varies with the editor.

The useful thing to establish is which of the three you actually have.

## The three limits

Directory scope is the first and the most widely available. The command runs with the project as its
working directory, and files outside it are unreachable.

Network access is the second. Blocking it stops an install, a fetch and anything that reports home,
which covers a large share of the accident class from the previous lesson.

Environment variables are the third and the least well covered. A command inherits whatever the editor
was started with, so a token in a shell profile is a token a command can read and print. A credential
belongs in a file the agent cannot read rather than in the environment, where it ends up in a log.

## What a sandbox does not stop

Three things get through most of these settings.

- Anything inside the project directory, including the deletion of tracked files. That is why version
  control is the next lesson.
- A command that writes to a path the project already has access to, such as a cache in a home
  directory, when the scope is wide.
- An instruction embedded in a file. A sandbox limits what happens after the model decides to act, and
  says nothing about how it decided.

## A configuration worth having

Where your editor offers scope and network controls, use both. Scope to the project. Network off, and
turned on deliberately for the one task that needs to install something. Then treat the sandbox as one
layer rather than as the answer, and keep version control as the layer underneath it.

## Check yourself

Find out which of the three limits your editor supports and turn on the ones it has. Then run a command
that tries to read a file outside the project and write down what happened, including a silent success.
