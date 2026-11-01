---
title: Describing the outcome
summary: A task statement that names the result, the constraints and the check.
chapter: The working loop
minutes: 12
status: draft
---

## Three parts to a task

An agent works from a description, and the description decides more of the outcome than the model does.
Three parts are worth writing every time, and they fit in a short paragraph.

- The outcome. What is true when the task is finished.
- The constraints. Where the code goes, what it may not change, which conventions to follow.
- The check. The command that decides whether it worked.

An outcome without a check produces a change nobody verified. A check without constraints produces a
change in the wrong place that passes. Constraints without an outcome produce a tidy edit that does not
solve the problem.

## Write the outcome about the system

State the outcome as something true afterwards rather than as a list of edits. "POST /loans refuses a
second loan of the same book to the same member" is a statement about the system. "Add a check to the
loans handler" is a statement about the diff, and it invites the check to be added anywhere.

## Constraints that earn their place

Four constraints change the result most often.

- The directory, which decides the shape of the code.
- A file to imitate, which is how you get the existing conventions rather than the model's average.
- What must not change, such as a public signature or a migration that has already been applied.
- The failure shape, whether that is an exception, a result object or a status code.

## The check belongs in the request

Naming the command means the agent runs it and reports the result, which gives the task an end
condition. Without one, the agent decides when it is done, and the way it decides is by reading its own
diff.

Naming the command also finds a problem early. If you cannot name a command that would tell you whether
the change worked, you do not yet have a way to review it.

## Check yourself

Take a task you gave recently and rewrite it with the three parts separated. Then rewrite the outcome
as a statement about the system rather than about the diff, and note which version an agent could
satisfy by accident.
