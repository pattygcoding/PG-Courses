---
title: The arithmetic of a context
summary: Why a long conversation is not a long prompt plus a long answer.
chapter: The economics of a call
minutes: 12
status: draft
---

## The part that multiplies

A conversation of twenty turns is not twenty independent requests. Every turn sends the whole conversation so
far, because the model has no other memory. So the input grows on every turn, and the cost across a session
grows faster than the number of turns.

That is the arithmetic people miss. Turn one sends one turn. Turn twenty sends twenty.

## Writing it down

```text
total input across n turns, each turn of about t tokens
  = t + 2t + 3t + ... + n t
  = t * n * (n + 1) / 2
```

For twenty turns of three hundred tokens, the last turn alone sends six thousand tokens and the session sends
roughly sixty-three thousand. Ten short conversations of two turns each send far less for the same content.

## What reduces it

Three things interrupt the pattern, and all three are worth knowing.

- Starting a new conversation, which resets the sum.
- Caching the prefix, which discounts the repeated opening and leaves only the new turn to pay for.
- Dropping what is finished, such as a large attachment the conversation has moved past.

The second is what makes a long session affordable, and it depends on the prefix being identical between turns.
A timestamp at the top of a system prompt defeats it on every turn, which is a mistake worth checking for
directly.

## The window is the other limit

Cost is only half of it. The same growth runs into the context limit from the generation chapter, so a session
long enough to be expensive is also one long enough to start truncating.

That is why the two problems arrive together, and why one habit answers both: a conversation per task.

## Check yourself

Take your longest recent conversation and estimate the tokens per turn and the number of turns. Compute the total
with the formula above, then compare it with what a fresh conversation per task would have cost for the same work.
