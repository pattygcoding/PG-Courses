---
title: Reading the diff before you keep it
summary: The review you owe a change, whichever way the lines were typed.
chapter: Chat and edits
minutes: 12
status: draft
---

## Reviewing your own change

A diff produced with the tool is reviewed like any other, with one difference in emphasis. The author's
intent is not evidence, because the author did not necessarily hold an intent. What the code does is
the whole of the evidence.

That is not a reason to distrust the change. It is a reason to read it rather than skim it, which is
what you would do for a change from someone new to the codebase.

## Four passes

Reading a diff four times, once per question, is faster than reading it once for all of them.

- What changed. The file list, before the contents, so a surprise appears at the top rather than in the
  middle.
- Does it run. Tests and types, which usually decides the review.
- Does it belong. Naming, structure, and whether the code is where this project would put it.
- What is missing. The branch not handled, the validation not added, the test not written.

## The part that gets skipped

Generated changes have one blind spot, and it is the same one every time: the paths that are not on the
happy run. An error response with the wrong shape. A guard clause that returns early without a log. A
failure branch that throws where the rest of the file returns a result.

The habit that finds them is to read for the branches rather than the lines. Count the `return`
statements and the `catch` blocks, and check that each is reachable and tested.

## Writing the review down

A review recorded on the pull request is worth more than one held in your head, because the next reader
sees what was checked. Two comments are usually enough: one naming what the change does, and one naming
what you checked that no test covers.

## Check yourself

Take a change you made with the tool last week and review it as though it came from someone else. Write
the four passes as a list and answer each one. Then say which pass found something, and whether one
repeated reading would have found it too.
