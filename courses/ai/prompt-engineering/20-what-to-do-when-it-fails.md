---
title: What to do when it fails
summary: Three responses to a bad answer, and which one to choose.
chapter: Structure
minutes: 12
status: draft
---

## Three responses

When a response fails to parse or fails to validate, there are three things to do and they differ in cost.

- Retry the same call, which is cheap and fixes nothing when the cause is systematic.
- Repair or coerce the value, which is cheap and hides the cause.
- Fail the call, which is honest and needs somewhere for the failure to go.

## Retry, and when it helps

A retry helps when the failure is sampling noise: the same prompt, a different draw, a valid answer. It helps
less often than people hope, because the failures that reach a parser are usually systematic. A prompt that
never names the format fails every time.

The version that helps is a retry with the failure attached, sometimes called a repair turn: send the bad
response back with the list of problems and ask for the same answer corrected. That turns a systematic failure
into a fixable one, at the cost of a second call.

## Repair, and why to avoid it

Coercing a string to a number, filling a missing key with an empty list, or accepting a key the schema did not
allow all produce a program that runs. They also delete the evidence, and the evidence is what says the prompt
is wrong.

Two exceptions are worth making. A trailing comma or a fence, which are presentation rather than content and
which the extractor already handles. And a field the provider documents as optional but which arrived absent,
where the default is defined by the API rather than by you.

## Failing, and where the failure goes

A failed call needs a destination. Three are common, and the choice is a product decision.

- An error the caller handles, which suits a batch job.
- A fallback value with the failure recorded, which suits a path where something is better than nothing.
- A prompt for a person, which suits anything the answer will be acted on.

Whichever is chosen, record the raw response. A failure report holding only the parsed value is a report with
the evidence removed, and the first question asked about it is always what the model actually said.

## The number you should not stop watching

Whatever the response, the pass rate is the thing to watch. A rate that moves after a prompt change is
information. A rate nobody measures is the reason the same failure reappears next month.

## Check yourself

Take one failure from your own use, choose which of the three responses applies, and write where the failure
goes. Then add the raw response to whatever you log and confirm the next failure is diagnosable from the log
alone.
