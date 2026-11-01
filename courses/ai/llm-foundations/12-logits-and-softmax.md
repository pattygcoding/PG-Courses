---
title: Logits and softmax
summary: Raw scores become probabilities, and the exponent is where the shape comes from.
chapter: Generation
minutes: 12
status: draft
---

## The last layer

The final layer produces one number per token in the vocabulary. Those numbers are logits: real values, not
yet probabilities, and unbounded in both directions.

Turning them into probabilities is the softmax, which exponentiates each one and divides by the sum:

```text
probability(i) = exp(logit(i)) / sum over j of exp(logit(j))
```

Two properties follow from that. Every probability is positive, and they sum to one.

## Where the logits come from

In a trained model the logits are the output of a learned projection from the hidden state up to the
vocabulary size. In the small model used here they are the logarithm of a count, which is enough to show
the arithmetic:

```text
next tokens after "the librarian":
  renewed    count-derived logit 1.386
  .          count-derived logit 1.386
  checked    count-derived logit 0.693
```

A logit of 1.386 is the logarithm of four and 0.693 is the logarithm of two. That is the trick in this
model: taking the logarithm of the count is what makes the softmax return the observed proportions, which
is what a counting model should do.

## The arithmetic

At a temperature of one the exponentials are `e^1.386`, `e^1.386` and `e^0.693`, which are four, four and
two. Dividing by their sum of ten leaves:

```text
temperature 1:
  renewed    0.400
  .          0.400
  checked    0.200
```

## Why the shape matters

Two properties of that function drive the rest of this chapter. It is monotonic, so a softmax never changes
the ranking of the logits. And it amplifies differences, so a two-point gap in the logits becomes a
four-to-one ratio in the probabilities.

That amplification is the lever every sampling setting pulls on. Temperature divides the logits before the
exponent, which stretches or flattens the gaps. Top-p discards the tail after the exponent.

## Check yourself

Take three logits of your choosing and compute the softmax by hand at a temperature of one, checking that
the results sum to one. Then double every logit and describe what happens to the distribution and why.
