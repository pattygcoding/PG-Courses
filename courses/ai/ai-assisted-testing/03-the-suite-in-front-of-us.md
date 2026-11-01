---
title: The suite in front of us
summary: Coverage, and the number it reports against the number it hides.
chapter: What a generated test is worth
minutes: 12
status: draft
---

## The measurement

Coverage reports which lines and branches a run executed. It is the cheapest measurement available and the
first one people reach for.

```text
#        loans.ts          |  89.33 |    62.50 |   81.82 | 41-42 44-45 47-48 65-66
```

Four columns: lines, branches, functions, and the lines nobody ran. The generated suite reaches 89 per cent
of the lines, and the branch figure is 62.50, which is the one that matters.

## Why branches lag behind lines

A line is executed or it is not. A branch is a decision, and a decision has two sides. A `return` inside an
`if` marks the line as covered while leaving the other side of the condition untested.

That gap between 89 and 62 is the signature of a suite written from the happy path. The lines ran because a
call was made. The branches did not, because only one side of each decision was ever taken.

## The uncovered lines

The report names them, and they are the branches a reader of the code would have picked out anyway:

```text
41-42  the unknown book refusal in borrow
44-45  the no copy refusal
47-48  the already borrowed refusal
65-66  the not held refusal in renew
```

Each is a refusal path. Each is also the case a caller hits most often in production, since a refusal is what
a user reports.

## The number that is missing

Coverage says a line ran. It says nothing about whether an assertion would notice if the line were wrong,
which is how a suite can reach 89 per cent of the lines and catch one change in ten. The next lesson adds the
measurement that answers the other question.

## Check yourself

Run coverage on one of your own suites and write down the branch figure. Then list the uncovered branches and
mark which of them a user could reach from outside the system.
