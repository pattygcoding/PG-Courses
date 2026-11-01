---
title: Accepting part of a suggestion
summary: Word by word acceptance keeps the good half and leaves the rest to you.
chapter: Completions
minutes: 11
status: draft
---

## Whole and partial

A suggestion is often right for one line and wrong for the block underneath it. Accepting it whole and
editing afterwards means cleaning up code you did not choose, which costs more than writing the part
yourself. Most editors offer a middle path, accepting one word or one line at a time.

```text
Tab            accept the whole suggestion
Ctrl+Right     accept the next word of the suggestion
Ctrl+Down      accept the next line of the suggestion
```

Read a suggestion word by word and it becomes a conversation. Take the name that is right, skip the
argument that was invented, and stop before the branch that does not belong.

## Where it pays

Partial acceptance earns its place in three situations. A long suggestion whose first line is exactly
what you wanted. A suggestion that chose a plausible but wrong helper name, where the shape of the
call is still useful. A suggestion that is right until the error handling, which is the part you want
to write with the failure path in mind.

There is a cost worth naming. Partial acceptance produces a line whose provenance nobody can review,
because the final text is a mixture and no record survives of which half came from where. When the
line matters, finish it yourself.

## The blank line

One habit makes the whole thing cheaper. Press enter to start a new line and ask again. The model now
has a different window, and often returns a different answer, because the text above the cursor has
changed.

## Check yourself

Find a suggestion four or five lines long. Accept it a word at a time, stopping at the first word you
disagree with, and write the rest yourself. Undo the whole thing, press enter for a blank line, and
ask again. Note which of the two versions needed more editing.
