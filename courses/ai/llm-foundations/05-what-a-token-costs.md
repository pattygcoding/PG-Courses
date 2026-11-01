---
title: What a token costs
summary: Input and output priced differently, and the arithmetic that follows.
chapter: Tokens
minutes: 12
status: draft
---

## Two prices

Providers charge per million tokens, and they charge two rates: one for the tokens you send and a higher
one for the tokens the model produces. Output costs more because generating a token takes more compute
than reading one.

Prices change and they differ by model, so look up the current figure rather than trusting a number
quoted in a course. The shape of the arithmetic is the part that lasts.

## The formula

```text
cost = (input tokens / 1_000_000) * input price
     + (output tokens / 1_000_000) * output price
```

Take a file of 500 tokens of code, a 200-token question and a 400-token answer. The input side is 700
tokens and the output side is 400. Where output costs five times input, the answer is around three times
as expensive as everything you sent, which is the ratio that surprises people.

## Where the cost actually goes

Three places, roughly in the order they dominate.

- The conversation so far, resent on every turn. A long chat is charged again each time it continues.
- The system prompt and the tool schemas, which are fixed per request and invisible in your typing.
- The output, which is the part you control least, since the model decides when to stop.

The second explains a surprising bill at the end of a month of short questions. The first explains why
one long conversation can cost more than ten short ones covering the same ground.

## Caching

Providers discount a prefix that repeats between calls, usually by remembering the processed form of a
long prompt. A system prompt and a set of tool schemas are exactly that kind of prefix, which makes the
discount worth understanding.

Two caveats. The prefix has to match exactly, whitespace included, so a timestamp at the top of your
system prompt defeats it. And the discount applies to input only, so it does nothing for a long answer.

## Check yourself

Estimate the input and the output tokens from your last week of use, separately. Compute the ratio
between them, then write down which of the three places above you would reduce first and what that would
change.
