---
title: Measuring tokens per second
summary: A measurement of your own, and what it does and does not mean.
chapter: The economics of a call
minutes: 12
status: draft
---

## The measurement

Tokens per second is the tokens produced divided by the elapsed time. On the small model built for this course,
generating a long run and timing it gives:

```text
timing on this machine, 42 tokens:
  0.10 ms total
  437500 tokens per second
```

Roughly 437,500 tokens per second, and almost none of it is instructive. The number is real and it measures a
table lookup rather than a language model, because the toy generator does no matrix multiplication at all. It is
here to make one point: a number without the thing it measured is a number you cannot use.

The generation also stopped at 42 tokens, because the two-word context eventually had no continuation. A short
run in a timing test is a sign to check whether the loop ended rather than finished.

## What a useful measurement includes

Four fields, and leaving out any of them makes the result incomparable.

- The model and its quantisation, since a smaller file is faster.
- The prompt length, because input processing is part of the time.
- The output length, since the first token costs more than the rest.
- The hardware, including whether a GPU was involved.

A figure without those is a claim about a machine rather than about a model.

## Measuring your own

Two numbers rather than one, as the previous lesson argued. Send a prompt, record the time to the first token,
record the time to the last, then divide the output token count by the difference. That gives the streaming rate
rather than a rate diluted by input processing.

Run it five times and keep the spread. A single sample from a shared service is mostly a measurement of the
network.

## What the number is for

Comparing two configurations on your own workload: two models, two quantisations, or a local model against a
hosted one. That comparison is what the rest of this chapter needs, and it is the job the number is good for.

## Check yourself

Measure time to first token and streaming rate for one prompt, five times, and record the range. Then change one
field from the list above, such as the prompt length or the quantisation, and measure again.
