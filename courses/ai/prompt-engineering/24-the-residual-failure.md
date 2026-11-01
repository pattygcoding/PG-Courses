---
title: The residual failure
summary: The case that survives the rewrite, and what it is telling you.
chapter: Iteration
minutes: 12
status: draft
---

## The case that stayed broken

After the rewrite, the changelog prompt failed one case, and it is the most interesting line in the report:

```text
  FAIL  two commits, one of them housekeeping
          no entry for 9d0e1f2
```

The prompt says one entry per commit and no entry for a commit that is not listed. The version 1 failure on the
same case had two problems, and one of them is gone:

```text
          no entry for 9d0e1f2
          an entry for a commit that was not listed: 0000000
```

The invented hash disappeared, because the rule against it worked. The dropped commit stayed.

## Why the rule did not fix it

The two failures look alike and they differ in kind. Inventing a hash is a format failure, so a rule about
hashes fixes it. Dropping an entry is a judgement: the model decided a dependency bump was not worth listing,
which is a reasonable editorial view that the instruction never addressed.

A rule cannot fix a judgement unless you can state the judgement. "List every commit, including dependency
bumps" would fix the case, at the cost of a changelog nobody reads.

## What a residual failure tells you

Three readings, and a case like this is worth keeping because it forces one of them.

- The prompt needs one more rule, which is the cheap reading.
- The requirement is genuinely ambiguous, so the case is specifying something the product has not decided.
- The requirement is not a prompt job at all and belongs in the code that assembles the list.

In this suite the second reading is the honest one, which is why the case stays failing rather than being
deleted. A failing case that records an open decision is more useful than a green set that hides one.

## Deleting a case on purpose

A case can be deleted, and the reason has to be recorded. Two legitimate reasons: the behaviour it pinned is no
longer required, or the case duplicates another and the checks are the same.

A case deleted because it is inconvenient removes the only evidence that the behaviour was ever specified, and
the next person to change the prompt reintroduces the failure without noticing.

## Check yourself

Take the failing case in your own set and decide which of the three readings applies. Then either write the
rule, record the open decision beside the case, or move the requirement into code.
