---
title: Instructions for your repository
summary: One committed file that states the rules, so the review is about substance.
chapter: Working practice
minutes: 12
status: draft
---

## A file the tool reads

Most assistants support a repository file that is added to the prompt, usually living in the repository
root or in a dot directory inside it. Whatever the name, the mechanism is the same: text committed to
the repository that the model is told to follow.

That turns a private habit into a team asset. The conventions you keep repeating in chat become a file
the next person inherits.

## What belongs in it

Short and specific beats long and general. Five kinds of line earn their place.

- The commands. How to install, how to run the tests, how to type check. A model that knows the test
  command can be asked to run it.
- The layout. Where handlers live, where tests live, where a new module belongs. This is the constraint
  that changes the most suggestions, because it is the one a model cannot infer from a single file.
- The style decisions that are not universal. The shape of an error, results against exceptions,
  whether comments are expected at all.
- The things not to do. Generated files that must not be edited, migrations written by hand, a
  directory that is vendored.
- The boundaries. Which paths must not be sent anywhere, and what to do when a task needs one.

## What does not belong in it

A restatement of the language is wasted space, and so is an instruction to use good judgement. A file
of forty style rules that nobody enforces will be ignored by the team and by the tool. Prefer the rules
you would enforce in review.

## Keeping it honest

Treat the file as code. It lives in version control, it changes when the conventions change, and it is
reviewed. A file describing last year's layout sends suggestions in the wrong direction, which is worse
than having no file at all, because the wrong answer now looks right.

## Check yourself

Write the file for your repository in twenty lines or fewer, covering the commands, the layout and one
rule you find yourself repeating. Commit it. Then ask for a change that belongs in a new module and
note whether the suggestion puts it in the right place.
