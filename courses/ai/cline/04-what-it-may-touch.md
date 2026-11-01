---
title: What it may touch
summary: Approvals, automatic approval, and the settings that decide the blast radius.
chapter: Setting it up
minutes: 12
status: draft
---

## The approval prompt

Every write and every command passes an approval in the default configuration. Approving one step is a
small decision, and the decisions compound: forty approvals in an hour is forty chances to press the
key without reading, which is how a bad command gets through.

Knowing that is the point of this lesson. When the prompts have become reflexive, the setting that
decides what needs approval is the thing to look at, rather than your attention.

## Automatic approval

Agents offer a mode where a category of action is approved without asking. The usual categories are
reads, edits inside the project, and commands matching a list. The configuration that works is narrow:
automatic approval for reads, and a short command allow list covering the commands you run fifty times
a day.

Three things are worth keeping manual in every project. Anything that installs or upgrades a
dependency, anything that reaches the network, and anything that deletes rather than changes.

## Scope

Two settings decide where the agent may look and write. The first is the workspace root, which is the
directory the repository lives in. The second is whether files outside it may be read, which matters
when your build reads something in a parent directory or your configuration lives in a home folder.

Allowing access outside the project is a decision about your machine rather than about the repository,
so it belongs in your own notes and not in the project's instruction file.

## A configuration worth copying

```text
reads            automatic
edits            ask
commands         ask, except the ones on the allow list
outside project  no
steps per task   a number you set on purpose
```

That is conservative and workable. It keeps the interruptions at the edits and the commands, which are
the two places where a mistake costs more than a keystroke.

## Check yourself

Write down your editor's current setting for each of the five lines above, and change one of them
deliberately. Then run a task and count how many approvals it asked for.
