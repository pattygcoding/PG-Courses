---
title: Choosing the example
summary: An example drawn from your own code teaches your conventions.
chapter: Examples and delimiters
minutes: 11
status: draft
---

## The example sets the house style

An example lifted from your own repository transfers more than a format. It carries the naming, the error
shape, the comment density and the ordering of the keys, which are exactly the properties a review would
otherwise raise as comments.

That is the reason to take the example from real code rather than writing a tidy one. A tidy example teaches
tidiness. A real one teaches this repository.

## What makes a good one

Four properties, and the first matters most.

- Short enough to read in one look.
- It shows one thing, so it cannot be half applied.
- It is close to the input you will actually send rather than to the easiest case.
- It holds nothing specific to the day it was written, such as a timestamp or a customer name.

## The cost of a mismatched example

An unrepresentative example produces confident output in the wrong shape. In the suite, the second changelog
case asks for a documentation-only commit to be labelled, and the version with no rule and no example
produced an unlabelled entry:

```text
  FAIL  a documentation-only commit
          no entry says "docs"
```

An example showing a documentation entry beside a feature entry would have fixed that without a rule, because
the label would have appeared in the shape being copied.

## Trimming one you already have

The cheap route is to take a merged pull request and cut it down. Keep the part showing the shape, cut what
only made sense in its context, then check that the trimmed version would still pass whatever you are
checking.

## Check yourself

Find a merged change that is representative of a task you repeat, trim it to under ten lines, and use it as
the example in the prompt for that task. Run the prompt and compare the answer with the change you took it
from.
