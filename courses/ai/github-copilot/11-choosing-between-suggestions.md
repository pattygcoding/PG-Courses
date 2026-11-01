---
title: Choosing between suggestions
summary: Cycling through alternatives, and the point at which more options stop helping.
chapter: Completions
minutes: 10
status: draft
---

## Asking for another

A suggestion is one sample from a distribution. Most editors let you step to the next one without
dismissing and retyping, so the first answer costs you only the seconds spent reading it.

```text
Alt+]      next suggestion
Alt+[      previous suggestion
```

Three candidates from the same context share a great deal. They agree on the shape and differ on the
choices, and that is useful information. Where three answers agree, the pattern is doing the work.
Where they disagree, you are looking at the part of the problem that needs a decision.

## When cycling stops helping

Cycling is cheap and it is not free. Each step costs a moment of reading, and past the third or fourth
candidate the returns drop, because the same window keeps producing the same family of answers. Ten
suggestions that all call a function which does not exist have told you one thing, ten times.

Repetition is the signal to stop. When two candidates in a row share the weakness you noticed, the
context is the problem rather than the sample, and the fix is above the cursor: a sharper comment, a
better type, a shorter file.

## Reading the difference rather than the answer

A habit that makes cycling pay is to compare candidates instead of reading them. What does the second
one do that the first does not? If the answer is a different function name, the name is the uncertain
part and it deserves a deliberate decision. If the answer is a different branch order, the rule is the
uncertain part.

## Check yourself

Find a line where the suggestion is plausible but not what you want. Cycle through five candidates and
split what you see into the parts they share and the parts they disagree on. Decide which list needs a
decision from you, change the comment above the cursor to make that decision, and ask again.
