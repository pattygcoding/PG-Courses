---
title: Latency and time to first token
summary: Two numbers rather than one, and why they are experienced differently.
chapter: The economics of a call
minutes: 12
status: draft
---

## Two numbers

Latency splits into two measurements that a person experiences as different things.

- Time to first token. How long before anything appears, which reads as responsiveness.
- Tokens per second after that. How fast the rest arrives, which reads as speed.

A model with a slow first token and a fast stream feels responsive. The reverse feels broken at the same total
time, because an empty screen is what people notice.

## What drives each

Time to first token is dominated by the input. Every input token has to be processed before the first output
token can be produced, so a long prompt delays the start, and a cached prefix removes most of that delay.

Tokens per second is dominated by the output and by the hardware. It is the part that moves with the model's
size, which is why a smaller model feels faster in a way a single latency figure hides.

## The arithmetic of a streamed answer

An answer of four hundred tokens at forty tokens per second takes ten seconds of streaming, and that sits on top
of the time to first token. The same answer from a model twice as fast arrives in five.

That is also the arithmetic behind a per-token cap on an interface. A cap of two hundred tokens does not halve
the wait if the first token took three seconds.

## What follows for design

If the interface shows a placeholder while the first token is pending, perceived speed tracks the input size. If
it shows nothing until the answer is complete, the number that matters is the total.

The practical version is three lines: stream the output, keep the prefix stable so it can be cached, and measure
both numbers separately. A single total hides which of the two is the problem.

## Check yourself

Time one request in two ways, from sending to the first visible token and from sending to the last. Then add a
large attachment to the same question and time the first number again, to see how much of it was input
processing.
