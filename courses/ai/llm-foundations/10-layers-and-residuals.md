---
title: Layers and residuals
summary: The same block repeated, and the two details that make a deep stack train.
chapter: The transformer
minutes: 12
status: draft
---

## One block, repeated

A transformer is one block repeated dozens of times. Each block does attention, runs the result through a
small feed-forward network, and wires the two together with residuals and normalisation.

```text
x = x + attention(norm(x))
x = x + feedForward(norm(x))
```

That is one block. A large model stacks thirty to a hundred of them, so a tensor entering the stack leaves
it having been refined that many times.

## The residual connection

The `x +` at the front of each line is the residual. It means the block learns a change to apply rather
than a whole new representation, and it gives the gradient a path straight through the stack.

Without it a deep stack of these blocks does not train, which was one of the findings that made the
architecture work at scale. The residual is also why a block can be skipped: setting its attention to
nothing leaves the input unchanged rather than destroying it.

## The feed-forward part

Attention moves information between positions. The feed-forward network is where most of the parameters
live, and it processes each position on its own, as two linear layers with a non-linearity between them.

That split is worth remembering when you read a parameter count. The attention projections are a fraction
of it and the bulk sits in the feed-forward layers, which is why cutting a model's size usually means
narrowing those.

## What the layers do

There is a rough division of labour that holds across models. Early layers handle local syntax and short
patterns. Middle layers carry the part of the computation that looks like reasoning about the text. Later
layers move the representation towards the vocabulary, because the final layer has to produce one score
per token.

That picture comes from probing trained models rather than from the architecture, so treat it as a tendency
rather than a rule. It is still useful when deciding whether a smaller model can do your task, because a
job that needs the middle layers cannot be served by truncating the stack.

## Check yourself

Write the two lines of a block out and label which part moves information between positions and which part
processes a position alone. Then explain, in one sentence, why the second part holds most of the
parameters.
