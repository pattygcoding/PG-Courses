---
title: The output format
summary: One format, stated once, with the shape written out.
chapter: The shape of an instruction
minutes: 12
status: draft
---

## Why the format is part of the specification

The caller parses the answer. A response in prose is unparseable however good its content, and the failure
lands far from the cause: a parse error in your code rather than a missing line in your prompt.

That is the first failure in the suite, and it has nothing to do with the model's ability:

```text
  FAIL  a column added to an existing table
          no JSON object in the response
```

## Write the shape out

A format statement has three parts: name the format, show the literal shape, and say what is not allowed.

```text
Return one JSON object and nothing else, with a finding per rule broken:
{"findings": [{"rule": "R1", "line": 4, "comment": "..."}]}
Do not report a rule that holds. Report each rule at most once.
```

The literal shape does more work than the words around it. It shows the key names, it shows that `findings`
is an array, and it shows the type of each value by example.

## State the empty case

The case that catches people is the successful one with nothing to report. A model asked for findings will
produce a finding, so the prompt has to describe an empty result. Both versions in the suite handled it:

```text
  pass  a diff that breaks no rule
```

Both returned `{"findings": []}`, which is why that case passes for the vague prompt while the other two in
the same group do not.

## Name what is not allowed

Four prohibitions are worth writing by default: no prose around the value, no comments inside the JSON, no
trailing commas, and no keys beyond the ones shown. Each has a name in the schema you validate against, so
each can be checked rather than hoped for.

## Check yourself

Write the shape for one output you parse, including an empty result and one prohibition. Then feed a
deliberately wrong response through your parser and confirm the failure message is legible enough to act on.
