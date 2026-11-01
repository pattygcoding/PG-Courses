---
title: Running models locally
level: Intermediate
summary: Run a model on your own hardware, size it to your memory, and serve it behind an OpenAI-compatible endpoint.
labels:
  - AI
  - Local
  - Models
minutes: 22
status: planned
---

## What this course is

A model you run yourself has no per-call price, works offline, and never sends your code to another
company. It also has to fit in your memory, and it will be slower and usually less capable than the
hosted model you were using. Whether that trade is worth it depends on the task, and this course gives
you the numbers to decide rather than an opinion.

The mechanics are approachable. An installer and a model file. Quantisation, which shrinks a model by
storing its weights at lower precision and costs some quality. The arithmetic that turns a parameter
count into a memory figure. A server that speaks the same API as a hosted provider, so the client code
you already have keeps working.

## Who it is for

You have a machine with a reasonable amount of memory and you want a model running on it, for privacy,
for offline work, or to stop paying per token while you iterate. You are comfortable in a terminal and
with reading a memory figure off a screen.

## What you will build

A local inference server on your own machine, exposing an OpenAI-compatible endpoint that the earlier
courses in this section can point at.

Against that server you run a task from this catalogue on three quantisations of one model, and write
down the quality, the memory and the tokens per second of each, so the choice of a file becomes a
measurement rather than a guess.

## Prerequisites

A machine with at least 16 GB of memory, ideally with a GPU, and roughly 10 GB of free disk for model
files. The Python or TypeScript course covers the client code.

## How the pages are ordered

The first chapter is what runs where: CPU against GPU, system memory against video memory, and the
arithmetic that turns a parameter count into a memory figure. The second is getting a model: the
server to install, the file formats, and where those files come from.

The third is quantisation, from the full-precision baseline to the four-bit files most people run,
with the quality and the speed each one costs. The fourth is serving it: the API it exposes, the
context length you can afford at that size, and how to point an existing client at it.

The fifth is measurement, covering tokens per second, time to first token, and the three-quantisation
comparison. The last chapter is the decision, comparing a local model with a hosted one on cost,
latency, privacy and capability for the work you actually do.

Read them in order the first time, following the contents list on this page. The comparisons use one
machine, and the memory figures assume the machine described in the prerequisites.
