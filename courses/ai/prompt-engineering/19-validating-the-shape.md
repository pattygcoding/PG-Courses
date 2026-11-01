---
title: Validating the shape
summary: Four checks a schema performs, and the one it cannot.
chapter: Structure
minutes: 13
status: draft
---

## The four checks

A schema catches four kinds of deviation, and all four appear in real output.

- A missing key, where the response omits a field.
- A wrong type, where a number arrives as a string.
- An unexpected key, where the model adds a field the caller did not ask for.
- A value outside a set, where an identifier is not one of the allowed ones.

Each appears in the suite's failures:

```text
  FAIL  a new table with three columns
          $: missing required key "down"
  FAIL  a query with no bound
          $.findings[0].rule: expected one of R1, R2, R3, got "UNBOUNDED_QUERY"
```

The first is a missing key and the second is a value outside the set. Both parsed as JSON and both were
unusable to the caller.

## Writing the schema beside the prompt

The schema belongs in the same file as the prompt, and it should be the source of the shape you show in the
format line. One definition and two renderings, which is the only way the prompt and the check stay in step.

Where the provider supports a structured output mode, the same schema goes into the request, so the prompt
text, the constraint and the check all read from one definition.

## Report a path, not a sentence

Report a problem with a path rather than a sentence. `$.findings[0].rule` names the element and the key, which
is what makes a failure fixable without re-reading the whole response. A message saying the output was invalid
sends someone to the raw text instead.

## The check a schema cannot do

A schema says nothing about meaning. `{"rule": "R1", "line": 9999}` validates and is wrong, and the third
changelog case in the suite is exactly that shape: valid JSON, valid schema, one commit missing.

That is what the second kind of check is for, and it is the next chapter.

## Check yourself

Take one schema and write a response that passes it and is still wrong. Then write the extra check that would
catch it, and decide whether that check reads the parsed value, the raw response, or both.
