---
title: Limits on a tool
summary: Read-only where it can be, and the approval a write deserves.
chapter: Tools and judgement
minutes: 12
status: draft
---

## A tool is a capability

Registering a tool gives the agent a new ability, and the ability is whatever the handler can reach. A
tool that reads the catalogue is a read capability. A tool that places a loan is a write, and a write
reached from a loop deserves more thought than a read.

The first design question for any tool is which of those it is, because the answer decides everything
else.

## Keep the read and the write apart

Two tools are better than one with a flag. `search_catalogue` and `place_loan` can be approved
differently, described differently and tested differently, and the separation is what makes a narrow
permission possible.

A single tool with an `action` argument takes all of that away, and it gives the model a way to reach the
write path through a call that looks like a read.

## What a write tool needs

Three things, in order of importance.

- Validation on the arguments, in the handler rather than in the schema alone, since the schema is
  advisory and the handler is the boundary.
- An approval step, so a person sees the call before it takes effect.
- A log line carrying the arguments, so the question of what an agent did can be answered afterwards.

## Limits that belong in the handler

Some limits are properties of the operation rather than settings on the client. A tool that returns ten
records instead of ten thousand keeps the window usable. A tool that refuses a loan for a member outside
the request's scope enforces a rule the schema cannot express.

Those belong in code, because a second client would otherwise have to rediscover them.

## Testing a tool

A tool is code, and it takes a test like any other. Two cases are worth writing first. The call with a
valid argument, asserting the text that comes back. And the call with a bad argument, asserting that the
failure is reported rather than thrown away. The second is what keeps a typo in a tool name from looking
like an empty result.

## Check yourself

Take a tool you have registered and classify it as read or write. Then add one limit inside the handler
that configuration cannot express, and write the two tests above for it.
