---
title: Questions about the whole repository
summary: Repository-wide questions work when the answer lives in one file, and miss when it does not.
chapter: Chat and edits
minutes: 12
status: draft
---

## What a repository question does

Most editors offer a way to ask about the repository rather than the selection, usually behind a marker
such as `@workspace` in the prompt. Underneath, the tool searches for the parts that look relevant to
the question, puts those in the prompt, and answers from them.

That explains both the successes and the failures. A question whose answer sits in one file the search
finds is answered well. A question whose answer is spread across four files, or lives in behaviour
rather than in text, is answered from the two files that were retrieved.

## Questions that land

```text
Where is the loan due date format defined?
How does this repository report a validation failure?
Which handlers answer with 422?
```

Each has a textual answer in a small number of places, which is the shape retrieval handles best. The
second is the most valuable of the three, because it tells you the local convention before you add a
fourth way of doing the same thing. Run that check before writing any new error path.

## Questions that do not

Three shapes fail predictably. A question about runtime behaviour, because the answer is in a database
or a log rather than in a file. A question about history, because retrieval reads the working tree and
not the commit log. A question about something absent, such as whether a caller ignores a return
value, because searching for what is missing returns nothing to reason from.

Those belong to the tools already in your editor. Text search, the symbols view, and `git log -S`
answer questions about absence and history exactly.

## When the answer names a file

An answer citing a file and a line is more useful than one that does not, and it is also a claim you
can check in seconds. Open the line. If the citation is wrong, everything built on it is wrong, and
the rest of the answer is worth discarding rather than reading.

## Check yourself

Ask the panel where your repository defines an error response and open every file it names. Answer the
same question with a text search and compare the two lists. Write down which was complete, and use
that source first from then on.
