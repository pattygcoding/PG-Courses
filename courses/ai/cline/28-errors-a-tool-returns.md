---
title: Errors a tool returns
summary: Two kinds of failure, and the one the model can recover from.
chapter: Tools and judgement
minutes: 12
status: draft
---

## Failure inside the protocol

A tool call can fail in two different ways, and they are handled in different places. The call can be
malformed, which the protocol rejects with an error object. Or the call can be well formed and the
operation can fail, which is reported in the result behind a flag.

The second kind is the one worth designing, because the model reads it and decides what to do next.

```json
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"3: The Left Hand of Darkness"}],"isError":false}}
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"0"}],"isError":false}}
{"jsonrpc":"2.0","id":5,"result":{"content":[{"type":"text","text":"unknown tool: delete_everything"}],"isError":true}}
```

Three real replies from the server in the previous lesson. The first two carry results. The third carries
a failure with `isError` set, which is the shape that lets the loop continue rather than abort.

## Why the flag matters

A protocol error stops the conversation. A result with the flag set goes back to the model as text, and
the model can then call the tool again correctly or try a different one. That is the difference between a
loop that recovers and a loop that dies on the first mistake.

## Writing messages a model can act on

A failure message is an instruction, so the rules that apply to any instruction apply here. Three
properties are worth building in.

- Say what was wrong with the input, using the argument name.
- Say what a correct call looks like, where that is short enough to include.
- Leave out the stack trace. It is long, it is not actionable, and it occupies the window.

The message above is `unknown tool: delete_everything`. The model reads the name it got wrong and can
correct itself, which it cannot do with a message that says only that the call failed.

## The distinction to keep

Not every failure is an error. A search that matches nothing is a successful call with an empty result,
and reporting it as an error teaches the model to retry a query that was fine. Reserve the flag for the
cases where the model's next action could reasonably be different.

## Check yourself

Take a tool that can fail and write both the success message and the failure message for one input. Then
call it with a wrong argument name and check whether the message tells the model what to change.
