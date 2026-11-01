---
title: The check that belongs in code
summary: Asking the model to be careful, and checking instead.
chapter: What a prompt cannot fix
minutes: 12
status: draft
---

## The transfer

A requirement that can be checked mechanically belongs in the check rather than in the prompt. The prompt asks
for the behaviour and the check decides whether it happened.

The suite for this course is that transfer, done three times over. Each prompt asks for an output shape and each
check independently verifies it:

```text
  FAIL  a new table with three columns
          $: missing required key "down"
```

That line is a prompt requirement enforced by code. The prompt could have asked more firmly, and the check is
what makes it a requirement rather than a hope.

## What transfers

Four kinds of requirement move well.

- The output shape, which a schema expresses exactly.
- Identifier sets, such as the allowed rule names or the commits that were listed.
- Arithmetic over the result, such as a count matching an input count.
- Cross-artefact agreement, such as the column names in a test matching the migration.

Each has a check of a few lines and a failure that names the problem.

## What stays in the prompt

Three kinds do not transfer, and asking for them in code is wasted effort.

- Tone and register, which have no mechanical test.
- Judgement about which of two valid answers is better.
- Anything the caller cannot observe, such as a preference not reflected in the output.

Those are the residual failures, and the honest position is a recorded decision rather than a check.

## The order to build them

The check comes second, after the prompt, and the case set is what says a check is needed. Writing checks for
requirements nobody has missed is speculative work, and the failing case is the evidence.

## Check yourself

Take a rule in one of your prompts and write the check that enforces it. If the check turns out to be one line,
delete the rule from the prompt and confirm the failure is still caught.
