---
title: Open tabs and the editor context
summary: The tool reads more than the file you are in, which is useful and occasionally wrong.
chapter: How the tool sees your code
minutes: 12
status: draft
---

## What is sent with a request

An inline suggestion is built from the file you are editing, in the form of the text before the cursor
and a smaller amount of the text after it, together with some indication of the other files you have
open. The names may differ between editors and versions; the idea does not. The model sees a window
around your cursor plus a hint of the neighbourhood.

That explains a behaviour people notice early. A completion suddenly uses a helper from a file you
looked at a minute ago, or copies a pattern from a tab you left open, and the code in the file you are
editing does not explain where it came from.

## Using open tabs on purpose

Once the behaviour is known it becomes a tool. If you want a new module to follow the conventions of
an existing one, open the existing one first, look at it, and then write the new one. The completion
arrives in that style, with the same naming and the same shape for error returns.

The reverse also holds. A tab you left open from a different project, with different conventions,
pulls suggestions in that direction. Closing tabs you are not using is not superstition; it changes
what the model is shown.

## The window is small

The amount of code sent is bounded, so a file of two thousand lines is not sent whole. The model sees
the region around the cursor, which means a helper defined at the top of a long file may not be in
view at all. When a completion ignores a function that plainly exists, this is the usual reason.

The same limit is why a file that is too long is a worse place to ask for help than a small one. The
chapter on chat returns to this, where the fix is to select the few lines that matter rather than hope
the whole file fits.

## Ordering the editor around the task

Bringing the ordering rules together gives a short checklist before starting a file:

- Close the tabs that belong to other work.
- Open the file whose conventions you want copied.
- Keep the cursor near the top of the function you are writing, so the types and helpers above it are
  inside the window.

## Check yourself

Open two files with different conventions, the way a repository often has. Put the cursor in the
second one and read the suggestion, then close the first file, reload, and read the suggestion again.
Note which conventions changed and write down the rule you would follow next time.
