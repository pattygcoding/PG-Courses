---
title: How language models work
level: Intermediate
summary: Tokens, context windows, sampling and why a model produces a confident wrong answer.
labels:
  - AI
  - Foundations
  - Models
minutes: 22
status: planned
---

## What this course is

A language model is a function that predicts the next token from the tokens before it. Everything a
coding assistant does follows from that one sentence, and most of the surprises engineers hit come
from expecting something else: that it looks facts up, that it remembers the last conversation, or
that a confident sentence reflects confidence about the facts.

This course covers the machinery at the depth a software engineer needs it. Tokens, and why the same
word costs different amounts in different places. The context window as the whole of what the model
can see. Sampling and temperature, and why two runs of one prompt differ. Embeddings as the bridge
from text to arithmetic. Where a model is trained, and what fine-tuning does that prompting cannot.

## Who it is for

You build software and you now build on a model, through an API or through a tool in the editor. You
want to reason about latency, cost and failure rather than treat the model as a black box.

Some comfort with probability helps. The course explains what it uses.

## What you will build

A small command line tool that calls a model API and reports what happened inside the request: the
token count before and after, the cost, the latency, and the difference between two runs at different
temperatures.

By the end you can read a prompt and estimate what it costs and what the model can see, which is the
arithmetic behind every other course in this section.

## Prerequisites

Python or TypeScript and a terminal, plus an API key for a model provider, or a local model from the
course on running models locally. The Python and TypeScript courses cover the languages.

## How the pages are ordered

The first chapter is tokens and tokenisation, including why code tokenises differently from prose and
what that does to a price. The second is the transformer at working depth: attention as a way to weigh
earlier tokens, and layers as repeated passes over the same idea.

The third is generation, covering the context window, the prompt as the whole of the memory, sampling
parameters, and the settings that trade variety for repeatability. The fourth is training: pretraining,
instruction tuning, fine-tuning and feedback from reviewers, each with what it changes and what it
leaves alone.

The fifth is failure: hallucination and why it comes from the same mechanism as a correct answer, plus
the checks that catch it. The last chapter is the economics of a call, covering latency, cost and the
tasks where a smaller model is the better choice.

Read them in order the first time, following the contents list on this page. Anything you can run is
run, and the outputs in the pages come from a real session.
