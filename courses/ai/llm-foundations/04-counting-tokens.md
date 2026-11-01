---
title: Counting tokens
summary: Estimating before the call, and why the estimate is always approximate.
chapter: Tokens
minutes: 12
status: draft
---

## Why an estimate is worth having

The token count decides the price and it decides whether the request fits. Both questions arrive before
the call, so an estimate that is close is more useful than a count that is exact and too late.

## Three rules of thumb

Three approximations hold well enough for planning.

- Prose in English runs at around four characters per token, so 2,000 characters is roughly 500 tokens.
- Code runs closer to one and a half characters per token, which matches the run in the previous lesson
  at 39 characters for 29 tokens.
- A line of code is roughly ten to fifteen tokens whatever its length, because the punctuation dominates.

The estimate is wrong in a predictable direction. Identifiers the tokeniser has seen are cheaper than the
estimate, and long runs of punctuation, digits or non-English text are more expensive.

## The exact count

Every provider exposes a counting endpoint or a tokeniser library, and the count is exact for that
provider's own vocabulary. Use it when the number matters, which is when you are near a limit or when the
call runs a million times.

The numbers differ between providers because the vocabularies differ. A count taken with one provider's
tokeniser is an estimate for another, close enough for planning and far enough apart to matter at a limit.

## Counting the parts of a request

A request is more than the text you typed. The system prompt, the tool descriptions, the conversation so
far and any file you attached are all counted, and in a long conversation they dominate. In a coding
assistant with a dozen tools attached, the schemas can be larger than your question.

That is why one question costs different amounts in two products, and why a shorter question does not
necessarily make the call cheaper.

## Check yourself

Estimate the tokens in your largest source file with the rules above, then count it exactly and note the
error. Repeat for a markdown file and say which of the two estimates was further out.
