---
title: What a call costs
summary: The arithmetic, and the parts of a request you did not type.
chapter: The economics of a call
minutes: 12
status: draft
---

## Three costs

Every request has three costs, and only one of them is the text you typed.

- The input tokens, which include the system prompt, the tool schemas, the conversation so far and any
  attachment.
- The output tokens, priced above input because generating a token takes more compute than reading one.
- The latency, which is what a person experiences and which moves on a different axis from the bill.

## The parts you did not type

In a coding assistant with ten tools attached, those schemas are sent on every request. A conversation in its
twentieth turn sends nineteen earlier turns with it. Neither appears in what you wrote, and in a long session
they dominate the count.

That is the most useful thing to understand about the bill, because it explains both the size of the number and
where to reduce it.

## A worked example

Using the token counts from the first chapter: a 500-token file, a 200-token question, a 400-token answer.

```text
input tokens   500 + 200 = 700
output tokens  400
```

With output priced at five times input, the 400 output tokens cost the same as 2,000 input tokens, so the
answer costs about three times as much as everything you sent. The prices themselves move and differ per model,
which is why the ratio is the durable part of that paragraph and the currency figures are not.

## Counting it before you send it

Two habits make the number predictable. Estimate the input before the call using the rules of thumb from the
first chapter, and note the output length on a few real answers so you know what to expect. A month of surprises
is usually a month of not having estimated either side.

For anything that runs often, an exact count from a tokeniser and a real price per million tokens turn the
estimate into arithmetic you can put in a spreadsheet, and a change to a prompt becomes a number rather than a
feeling.

## Check yourself

Take the largest request you made this week and estimate its three parts: system and tools, conversation history,
and your own words. Write down which part was largest, and which of the levers above would have reduced it.
