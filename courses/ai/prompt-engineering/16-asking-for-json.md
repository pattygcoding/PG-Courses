---
title: Asking for JSON
summary: The wording that produces a parseable answer, and the limits of asking.
chapter: Structure
minutes: 12
status: draft
---

## What the wording has to do

Four things are needed for a parseable answer, and a prompt that leaves out any of them produces output that is
right in every respect except the one you parse.

- Name the format.
- Show the literal shape.
- Say that nothing else goes in the response.
- Say what an empty result looks like.

The review prompt does all four:

```text
Return one JSON object and nothing else, with a finding per rule broken:
{"findings": [{"rule": "R1", "line": 4, "comment": "..."}]}
Do not report a rule that holds. Report each rule at most once.
```

## What it buys

The difference between asking and not asking is the first failure in the suite, where a useful answer arrived
unparseable:

```text
  FAIL  a column added to an existing table
          no JSON object in the response
```

## Where a provider can help

Several APIs offer a structured output mode, where the request carries the schema and the provider constrains
generation so the response fits. Where that exists, use it, because it is enforced rather than requested.

It does not remove the need for the fourth line above. An empty array still has to be permitted by the schema,
and a schema with `minItems: 1` on a findings list makes a clean diff impossible to report.

## Two fields that prevent a class of failure

Two small additions remove most of the remaining ambiguity. A field for the reason, so the model does not put
its reasoning in the prose around the JSON. And a field recording whether the answer is complete, which gives
the model somewhere to note uncertainty that a schema would otherwise force into the value.

## Check yourself

Take a prompt that returns JSON and check it against the four lines above. Then change one line, run it, and see
whether the output stops parsing.
