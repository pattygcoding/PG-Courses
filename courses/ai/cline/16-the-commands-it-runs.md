---
title: The commands it runs
summary: The shell is the tool with the widest reach, and its output is what the agent reasons from.
chapter: The terminal and the filesystem
minutes: 12
status: draft
---

## Why a shell is different

Reading and writing files are bounded. A shell is not. It can install software, change configuration,
reach the network, start a server and delete a directory. That is why it is the most useful tool in the
set and the one that needs a boundary.

It is also how the agent learns whether its own work succeeded, which is why removing it makes an agent
far less useful.

## The commands a task produces

A normal task generates four kinds of command.

- The check. A test run, a type check, a build.
- The look. `git status`, `git diff`, a listing, a search.
- The consequence. An install, a code generator, a migration.
- The accident. A command that changes something the task did not need to change.

The first two are safe and worth auto-approving. The third deserves a read every time. The fourth is
what the allow list is for.

## Reading a command before approving

Three things to look at.

- The verbs. A command that reads is a different decision from one that writes, and a single flag is
  often the only difference between them.
- The arguments. A path that turns out to be a directory rather than a file, or a glob that matches
  more than you expected.
- The destructive flags. `-f`, `--force`, `--hard`, `--no-verify`. Each one removes a safety that would
  otherwise have stopped the command.

## The output is part of the prompt

The agent reads the command's output and decides its next step from it, so the output is part of what
the model sees. A command that prints a thousand lines pushes everything else out of the window. A
command that prints nothing on success leaves the agent with no signal at all, which is a reason to make
the checks audible rather than silent.

## Check yourself

Look at the last ten commands an agent ran in your project and label each one as check, look,
consequence or accident. Write down any flag that removed a safety, and whether you noticed it at the
time.
