---
title: The ghost text
summary: What the grey suggestion is, when it appears, and how to dismiss it.
chapter: Completions
minutes: 10
status: draft
---

## Reading before accepting

A suggestion appears as grey text at the cursor and behaves like text until you accept it or move on.
The keys are worth learning properly, because the value of the feature depends on accepting being a
decision rather than a reflex.

```text
Tab          accept the whole suggestion
Escape       dismiss it
Alt+]        next suggestion
Alt+[        previous suggestion
```

Key bindings are remappable and differ between editors, so check yours. What matters is having a
dismissal that is as easy to reach as the acceptance, since a suggestion that is nearly right is the
common case and the slowest to handle when the only options are accept or undo.

## When it appears and when it stays quiet

The grey text arrives after a short pause. The pause is deliberate, because predicting on every
keystroke would spend requests on text you were still deciding about. The suggestion also stays quiet
in places where a continuation is noise, such as inside a string or in the middle of an identifier.

If nothing appears where you expect it, work through the causes in order. The pause has not elapsed.
Completions are off for this language. The extension is not signed in. The path is excluded by the
repository settings. Those four account for most cases where the tool looks broken.

## What acceptance does to a diff

Accepted grey text becomes ordinary code with no marker on it, so a diff cannot tell you which lines
were written and which were accepted. If that distinction matters to you, it has to be recorded
deliberately, which is why this course keeps returning to reading the diff rather than trusting the
author.

## Check yourself

Open a file and wait for a suggestion. Dismiss it from the keyboard without moving the cursor, then
ask for the next one and read that. Do it three times on the same line and write down which of the
three you would have written, and why the other two are wrong.
