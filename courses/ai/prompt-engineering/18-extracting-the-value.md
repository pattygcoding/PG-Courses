---
title: Extracting the value
summary: The three shapes to try, in order, and the parsing rules that make it safe.
chapter: Structure
minutes: 12
status: draft
---

## Three candidates in order

The extractor tries three readings of a response, cheapest first.

```text
1  a fenced block, if the response has one
2  the whole response
3  the first balanced object or array inside it
```

Ordered this way, a clean response costs one parse, and the expensive scan runs only on a response that needed
it.

## The scan

Finding the first balanced run is where the care goes. Three rules make it correct.

- Track whether the scanner is inside a string, so a brace inside a value is ignored.
- Track escapes, so a backslash before a quote does not end the string early.
- Stop at a depth of zero, so the object ends where it really ends rather than at the last brace in the file.

Skip any of the three and there is a response that breaks it. The third is the one to watch: a response holding
a JSON object and then an explanation containing braces ends at the wrong place if the scanner keeps going.

## What the scan does not do

It does not repair. A response with a trailing comma, a single-quoted key or a comment inside the object comes
back unparseable, and that is deliberate. Repairing is guesswork, and a caller that guesses cannot tell a small
deviation from a wrong answer.

Where repair is genuinely wanted, a provider's structured output mode solves it at the source, which is a better
place than a fixer in your code.

## Returning the outcome rather than the value

The extractor returns a value or a marker, never an exception. What comes back is the parsed value and a source
label, and the caller decides. That keeps the decision about a bad response in one place rather than spread
across the call sites.

## Check yourself

Write the three rules above as assertions, one per rule, and run them against a response crafted to break each.
Then write the fourth test for the case that should fail rather than be repaired.
