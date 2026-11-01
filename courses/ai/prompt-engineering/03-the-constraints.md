---
title: The constraints
summary: The kinds worth naming, and the ones that waste space.
chapter: The shape of an instruction
minutes: 12
status: draft
---

## Four kinds that change the answer

Constraints narrow the space of acceptable answers, and four kinds do most of the work.

- Where the code goes, named as a directory or as a file to imitate.
- What must not change, such as a public signature or a migration already applied.
- The conventions that are not universal, such as the failure shape or whether comments are expected.
- The names, when the domain has specific vocabulary and the wrong word changes the meaning.

The third is the one left out most often and the one with the largest effect on a codebase, because the
model's default is the average of every codebase it has seen.

## The version comparison

The review prompt gained a rule list between its two versions:

```text
R1  an error is caught and discarded
R2  a query has no WHERE and no LIMIT
R3  an import is never used
```

Three lines turn an open question into a closed one. Without them the model invented a rule name and the
output failed validation:

```text
  FAIL  a query with no bound
          $.findings[0].rule: expected one of R1, R2, R3, got "UNBOUNDED_QUERY"
```

The code was fine and the review was correct. The identifier was not one of the three the caller could
handle.

## Constraints that waste space

Three kinds do nothing. A restatement of the language, such as "use TypeScript". An instruction to be
careful or to use good judgement. A rule nobody enforces, since a prompt full of those gets the treatment a
style guide nobody reads gets.

## Negative constraints

A prohibition earns a line when the default is the thing you do not want. "Do not report a rule that holds"
belongs in the review prompt because listing every rule is a natural failure. "Do not invent a commit hash"
belongs in the changelog prompt, and its absence shows in the result:

```text
          an entry for a commit that was not listed: 0000000
```

## Check yourself

Take a prompt that once produced a change in the wrong place and write the constraint that would have
prevented it. Then decide whether it belongs in the prompt or in a rules file committed to the repository.
