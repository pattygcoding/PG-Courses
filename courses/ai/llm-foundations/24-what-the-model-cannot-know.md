---
title: What the model cannot know
summary: Four kinds of question to route elsewhere.
chapter: Failure
minutes: 12
status: draft
---

## Routing rather than hoping

Most of the damage from hallucination is avoidable at the point where you decide what to ask. Four kinds of
question have no answer inside the weights, and each has a tool that does have one.

## Anything about your own system

Your schema, your configuration, the decision recorded in a review six months ago. None of it was in any
training corpus, so a model asked about it is guessing from how systems like yours are usually built.

The answer is retrieval or attachment, and the simplest version of the second is attaching the file.

## Anything that changed recently

A library version, a pricing page, the status of a service. The training cutoff is a hard boundary, and a
confident answer about something after it is a description of what the previous version did.

Search, the package registry, or the release notes. Any of the three beats a guess.

## Anything arithmetic over many numbers

A long sum, a date difference across time zones, a percentage of a percentage. A model approximates these
because it was trained on text about numbers rather than on numbers themselves. It is reasonable at two-digit
work and unreliable well before the point where you would think to check it.

A calculator, a script, or the database. This is the one people skip, because the first few answers happened to
be right.

## Anything about the future

Whether a dependency will break, how long a task will take, what a change will cost at scale. The model
produces the register of a forecast because forecasts appear in its training text, and it has no more
information than you do.

## The question before the question

One habit covers all four. Before asking, decide where the answer would come from. If the honest answer is
nowhere, the prompt needs a tool or an attachment rather than a firmer instruction.

## Check yourself

Take five questions you have put to a model this week and mark each one with where the answer could have come
from: training data, an attached file, a search, or arithmetic. Then note which of them you asked without
attaching anything.
