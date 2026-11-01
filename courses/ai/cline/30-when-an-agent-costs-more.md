---
title: When an agent costs more
summary: The tasks where the loop is the wrong tool, and how to tell before you start.
chapter: Tools and judgement
minutes: 12
status: draft
---

## The calculation

An agent costs a description, a review and some number of steps. It returns the typing and the searching,
and on a patterned task it returns a lot of both. On a task that is not patterned it returns churn: a
change you have to read carefully, correct and run again.

So the judgement is about whether the work is patterned, not about whether the tool is good.

## Where it pays

Four shapes, and all four are common.

- A change that repeats an existing pattern in three more places.
- A rename or a move across a repository, where the work is wide and mechanical.
- A task that needs searching before it can start, where the plan is most of the value.
- A change you can check with one command, which makes the review cheap.

## Where it costs

Four shapes on the other side.

- A decision you have not made yet. An agent will make one for you, and it will be the average of its
  training data rather than your intent.
- A one-line fix you already have in mind, where writing the description costs more than the edit.
- A change in code that is unusual, where the average is exactly wrong and correcting it is the work.
- A task whose correctness you cannot check with a command, where the review is the whole cost.

## Deciding in ten seconds

Three questions, asked before starting.

- Could I describe this in a sentence a colleague could act on?
- Would the change follow a pattern already in the repository?
- Do I have a command that tells me whether it worked?

Three yes answers make it a task for the agent. Two make it a task for plan mode first. One is a task to
do yourself, and the earlier lessons in this course explain why each answer carries the weight it does.

## The judgement that stays with you

The tool does not know which case matters. It does not know that the lending path is audited, that the
migration has already run in production, or that this file has caused two incidents this year. Those
facts decide where care is spent, and they live with you and your team.

## Check yourself

Score your last four tasks on the three questions. Then write down the one where the agent cost more than
it returned, and which of the three would have told you that before you started.
