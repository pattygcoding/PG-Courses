---
title: AI security
level: Advanced
summary: Prompt injection, untrusted output and secrets, and what to sandbox before an agent touches your machine.
labels:
  - AI
  - Security
  - Risk
minutes: 24
status: planned
---

## What this course is

A model reads text from anywhere, and text from anywhere can carry instructions. That is prompt
injection: a web page, a code comment, an issue or a retrieved document that tells the model to do
something the person who asked the original question had not intended. No parser separates data from
instructions, so the defence is architectural rather than a better sentence in the system prompt.

This course looks at that surface the way a security review would. Untrusted input reaching a model
that holds a secret. Model output consumed as though it were trusted, whether as a shell command, a
query or a URL. An agent whose token can push to a branch. A retrieval corpus carrying material you
have no right to serve. Each one gets a concrete attack and the change that closes it.

## Who it is for

You are building a feature that calls a model and it will hold credentials or touch a system that
matters. You have written code that consumes input from outside your trust boundary before, and you
want to know what changes when a model is in the middle.

## What you will build

A threat model of the library agent, then a hardened version of it: an injection that reaches the
agent through a book title and persuades it to attempt an exfiltration, the change that stops it, and
the test that keeps it stopped.

By the end you have a written list of the trust boundaries in the system, the capabilities each
component holds, and the checks that fail when a boundary is crossed.

## Prerequisites

The agents course in this section, or another service that calls a model with a tool attached, plus
familiarity with authentication and authorisation.

## How the pages are ordered

The first chapter is the trust boundary: what the model sees, where that text came from, and which
parts of it an attacker can write. The second is prompt injection in both directions, direct and
indirect, with the examples that survive an instruction not to comply.

The third is output: model text reaching a shell, a query, a template or a URL, and the validation
that belongs at each of those edges. The fourth is secrets and data, covering what a prompt may
contain, what a log may keep, and what a corpus may serve.

The fifth is capability: least privilege for a tool, an approval step a person actually reads, and the
sandbox that limits the damage when the rest of it fails. The last chapter is the review to run before
shipping, written as a list of questions with a check behind each one.

Read them in order the first time, following the contents list on this page. Every attack in the pages
is run against the agent, and the output of each run is included.
