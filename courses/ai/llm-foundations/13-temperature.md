---
title: Temperature
summary: Dividing the logits, and the same context answered three ways.
chapter: Generation
minutes: 13
status: draft
---

## What the setting does

Temperature divides every logit before the softmax. Below one the gaps widen and the distribution sharpens.
Above one the gaps narrow and it flattens. At zero it stops being a temperature and becomes a decision to
take the highest logit every time.

The same three candidates at three temperatures, from a real run:

```text
temperature 0.5:
  renewed    0.444
  .          0.444
  checked    0.111

temperature 1:
  renewed    0.400
  .          0.400
  checked    0.200

temperature 1.7:
  renewed    0.375
  .          0.375
  checked    0.250
```

The ranks never move. Only the gaps change, and the rarest candidate goes from one in nine to one in four
across that range.

## One prompt, three answers

Because the choice is drawn from the distribution, a flatter distribution produces more varied output. One
prompt, one seed, three temperatures:

```text
temperature 0.5, seed 7, 14 tokens:
  the librarian renewed the loan for the reader . the librarian . the librarian . the

temperature 1, seed 7, 14 tokens:
  the librarian renewed the loan for the reader . the reader returned the book to the

temperature 1.7, seed 7, 14 tokens:
  the librarian renewed the loan for the reader . the reader returned the book to the
```

At 0.5 the loop stalls and repeats the same short cycle. At 1 and above it takes the branch into the second
sentence.

## Choosing a temperature

Three settings cover most work.

- Zero for anything that has to repeat: extracting a value, formatting output, running an evaluation.
- Around 0.2 to 0.4 for code, where the answer has one good shape and variation is a defect.
- Around 0.7 to 1 for prose, where variety is the point and a synonym is not a bug.

The cost of turning it up is not only quality. A high temperature makes an evaluation unstable, because two
runs of the same prompt disagree, so a number computed over twenty runs will not reproduce.

## Check yourself

Run one prompt at three temperatures and record the outputs. Then choose the temperature you would set for a
task in your own work and write down what you would check to confirm the choice was right.
