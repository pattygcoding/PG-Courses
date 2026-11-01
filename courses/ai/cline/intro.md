---
title: Cline
level: Beginner
summary: Plan a change, let an agent working inside the editor read and edit files, and check the diff it produced.
labels:
  - AI
  - Agents
  - Tooling
minutes: 22
status: planned
---

## What this course is

Cline is a coding agent that runs inside the editor. Where a completion predicts the next line, an
agent reads files, runs commands, writes edits and reports what it did. That changes the shape of the
work: you describe an outcome, it proposes a plan, you approve the plan, and it executes against the
real repository.

The loop around it is what this course is about. An agent is a model with tools and a stop condition,
and one of the tools is a shell. Everything that makes that useful also makes it risky: it can run the
wrong command, edit a file you did not mention, or spend a long time on a task you could have finished
yourself. The controls that keep it on the rails are mostly about what you allow and what you check.

## Who it is for

You are comfortable in a terminal and in git, and you want an agent to take the mechanical parts of a
change: the fifth endpoint, the migration, the rename across twelve files. You do not need to have run
an agent before, and you do not need to know how the model works.

## What you will build

A feature on the Northside Library API, from a written plan to a merged branch, driven through the
agent rather than typed by hand. Along the way you write the plan it follows, restrict the commands it
may run, review the diff it produces, and revert one change it got wrong.

By the end the project has the feature and a short guide of its own: the prompts that worked, the ones
that produced churn, and the checks worth running before any agent's work is accepted.

## Prerequisites

An editor with Cline installed, a model configured for it, and git. Node.js and TypeScript for the
examples, which the JavaScript and TypeScript courses cover.

## How the pages are ordered

The first chapter sets it up: the extension, the model behind it, and the difference between planning
and acting. The second is the working loop: giving it a task, reading the plan, watching the tool
calls, and stopping it partway.

The third is context, covering what it reads, the rules file that steers it, and what happens when a
task is larger than the window. The fourth is the terminal and the filesystem, including the allow
list for commands and the sandbox around them.

The fifth is verification: the diff, the tests, and the review you owe every change regardless of who
wrote it. The last chapter is the protocol for handing it extra tools, and the judgement call about
when an agent costs more than it returns.

Read them in order the first time, following the contents list on this page. Each scenario is written
to be run against a real repository.
