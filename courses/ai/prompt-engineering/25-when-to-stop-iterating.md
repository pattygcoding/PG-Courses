---
title: When to stop iterating
summary: The signals that a prompt is finished, and the ones that say to stop changing it.
chapter: Iteration
minutes: 12
status: draft
---

## Three signals to stop

A prompt is finished when three things hold, and none of them is a perfect score.

- Every case that represents a requirement passes.
- Every failing case is failing for a recorded reason, such as an open decision.
- The last three changes have not moved the rate.

The second is the one people resist, because a failing case looks like unfinished work. It is not unfinished
once the reason is written down.

## The signal that you are iterating in the wrong place

A rate that will not move after four attempts means the problem is not the wording. Three candidates, in order
of likelihood.

- The case tests something the prompt cannot control, which is the residual failure.
- The model cannot do the task at this size, so the answer is a larger model or a smaller task.
- The output is being checked somewhere the prompt does not reach, such as a field your own code assembles.

Rewording a prompt in that state produces churn and a rule list nobody can read, which is worse than a shorter
prompt with a known failure.

## The cost of a long prompt

Every rule added to fix a case is read on every call, paid for on every call, and competes with the rules
already there. A prompt that has grown to forty rules is a prompt whose later rules are applied inconsistently,
because the earlier ones dominate.

The suite's version 2 prompt has four rules and one example. That is close to the size at which a prompt stays
readable and its rules stay effective.

## Pruning

The counterpart to adding rules is removing them. A rule no case covers is a candidate, and a rule added for a
failure that no longer occurs is a stronger candidate. Delete one, run the suite, and the rate says whether it
was doing anything.

## Check yourself

Take a prompt with a long rule list and delete the rule that has no case behind it. Run the suite, note whether
the rate moved, then decide whether the rule was load bearing or decoration.
