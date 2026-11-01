---
title: Where the tool stops
summary: The work it does not do, and how to tell when you have reached the edge of it.
chapter: Working practice
minutes: 12
status: draft
---

## Four edges

Five chapters have covered what the assistant is good for. This lesson names where it stops, because
the edges are what decide where your attention goes.

## The edge of what it knows

The model knows what it was trained on. A library released after that, an internal service with no
public documentation, a framework version with a changed API: each produces answers that read like the
previous release. When a suggestion contradicts your own documentation, the documentation wins, and the
response is to put the current shape into the prompt rather than to argue with the answer.

## The edge of the pattern

The tool is strongest where the answer resembles something common. Where your project has a convention
that is unusual, or the problem is specific to your domain, the suggestion falls back to the average.
That is the signal that the code deserves writing deliberately, and probably a comment saying why, so
the next reader knows the difference was a decision.

## The edge of verification

Nothing in a suggestion is checked against your system, and the compiler checks less than it looks
like it does. A green build with a green suite is the strongest evidence available, and the tests
chapter exists because a suite can be green against code that is wrong. Past that line, the evidence is
a run against data you know the answer for.

## The edge of judgement

The tool does not know which case matters. It does not know that the lending path is audited, that the
pagination has a customer waiting on it, or that the function you are editing has caused two incidents
this year. Those facts decide where care is spent, and they live with you and your team.

## Working habits

Three habits cover most of the value in this course. Read the diff before keeping it. Break the code to
check that a test would notice. Keep the conventions in a file that the tool and the team both read.
None of those depends on which version of which assistant you are using next year.

## Check yourself

Pick the function in your repository that would hurt most if it were subtly wrong. Write down which of
the four edges applies to it, and what evidence you would need before trusting a change to it. Then
write the test that produces that evidence.
