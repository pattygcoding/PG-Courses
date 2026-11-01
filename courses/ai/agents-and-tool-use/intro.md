---
title: Agents and tool use
level: Intermediate
summary: Give a model tools, a loop and limits, and decide when an agent is the wrong answer.
labels:
  - AI
  - Agents
  - Tooling
minutes: 24
status: planned
---

## What this course is

A model that can call a function stops being a text generator. It can read a file, query a database or
open a pull request, then look at the result and decide what to do next. That loop is what people mean
by an agent, and the loop is where the difficulty lives: it can run for a long time, call the wrong
tool, act on a result it misread, or spend money while you watch.

This course covers the parts you write. Tool schemas a model can follow. A loop with a budget and a
stop condition. Errors returned in a shape the model can recover from. Permissions that keep a tool
inside its job. And the honest comparison against one call with a good prompt, which is often the
smaller and better answer.

## Who it is for

You have called a model API and you want it to do work rather than describe work. You are comfortable
writing a function, validating its arguments, and thinking about who is allowed to call it.

## What you will build

A tool server that exposes the Northside Library: search the catalogue, read a book record, place a
loan, return one. Then a small agent that answers questions through those tools, with a per-request
budget, a fixed set of permissions, and a log of every call it made.

By the end you have a server that another editor or agent can connect to, and a written account of the
two questions it answered wrongly and the tool call behind each.

## Prerequisites

Python or TypeScript, a model that supports tool calling, and the library data from one of the service
courses. Node.js 20 or later if you follow the server examples as written.

## How the pages are ordered

The first chapter is the tool call itself: a schema, a description a model can act on, and the
arguments that come back. The second is the loop, covering the message history, the stop condition,
the budget, and the difference between a loop that terminates and one that appears to.

The third is error handling: results shaped for recovery, retries with a limit, and tools that fail
without taking the run down with them. The fourth is permissions and sandboxing, including read-only
tools, an approval step, and the separation between what a tool may do and what a person asked for.

The fifth is state across calls, and the parts of a task worth storing rather than working out again.
The sixth is the protocol, so the tools you wrote can be used from an editor. The last chapter is the
decision: the tasks where one call with a good prompt beats an agent, and the tests that tell you
which you have.

Read them in order the first time, following the contents list on this page. Each chapter adds a tool
or a limit to the same agent, and the log from the previous chapter is what the next one checks
against.
