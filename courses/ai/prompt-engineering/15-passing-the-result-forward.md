---
title: Passing the result forward
summary: What to send to the second call, and what to leave out.
chapter: Decomposition
minutes: 11
status: draft
---

## Send the value, not the transcript

The second call needs the first call's *result*, not its conversation. Sending the whole history costs tokens,
carries whatever the first call got wrong, and makes the second call harder to reproduce on its own.

So the handover is the parsed value, rendered into the second prompt as a labelled input.

## The handover shape

```text
The migration below has already been written and approved:

{{migration}}

Write the test that fails if the migration and the code disagree about a column name.
```

The label says what the value is, the sentence says it has been approved, and the instruction refers to it
rather than repeating it. Three lines, and enough.

## Passing a decision with its reason

Where the first call returned a decision and a reason, both go forward. The reason is context the second call
would otherwise re-derive, and including it is what keeps the two halves consistent:

```text
{{decision}}
```

## Four things not to pass

- The first call's system prompt, which belongs to that call.
- The raw text with the JSON buried in the middle, which is harder to read than the value.
- Anything the first call produced that no longer applies, such as a plan that has been superseded.
- A secret the first call needed and the second one does not.

The fourth is the one that leaks. A split is a chance to send less, and the second prompt should hold only
what the second call needs.

## Check yourself

Take a two-call pair and write the exact text of the handover. Then remove one line at a time and run the
second call, to find which line was carrying the consistency between the halves.
