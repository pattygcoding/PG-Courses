---
title: Embeddings and retrieval
level: Intermediate
summary: Turn text into vectors, search by meaning, and build retrieval that answers from your own files.
labels:
  - AI
  - Retrieval
  - Search
minutes: 24
status: planned
---

## What this course is

A model knows what it saw during training, so a question about your repository, your tickets or last
week's decisions has no answer inside it. Retrieval fixes that by finding the text that matters and
putting it in the prompt.

The mechanism is an embedding: a vector for a piece of text, placed so that passages with similar
meaning sit near each other. From there it is ordinary engineering. Split documents sensibly. Store
the vectors. Search, then rerank. Measure whether the retrieved text contained the answer at all,
because a fluent final answer can sit on top of a retrieval step that found nothing useful.

## Who it is for

You have a corpus of your own, whether documentation, code or tickets, and you want a model to answer
from it rather than from memory. You are comfortable with an API, a database and a short script.

## What you will build

Semantic search over the Northside Library catalogue, built in stages: a first version that embeds the
book summaries and searches them, then chunking and overlap, then a hybrid search that combines vector
distance with keyword matching, then a reranking pass.

Alongside it you build an evaluation set of twenty questions, each with the passage that answers it,
so the quality of retrieval is a number rather than an impression.

## Prerequisites

Python or TypeScript, a store that can hold vectors or an index that can, and either an embedding API
or a local embedding model.

## How the pages are ordered

The first chapter is embeddings: what the vector means, how cosine similarity is used to compare two
of them, and why the same text embeds the same way twice. The second is chunking, which sets the
ceiling on retrieval quality more than any model choice does.

The third is storage and search, covering vector indexes, the trade between exact and approximate
search, and the metadata filter that turns a nearest-neighbour query into a useful one. The fourth is
hybrid retrieval: keyword search, rank fusion, and a reranker over the short list.

The fifth is answering: assembling the prompt from the retrieved passages, citing them, and refusing
when retrieval found nothing. The last chapter is evaluation, including the questions you keep, the
metrics that matter, and the changes that make them worse.

Read them in order the first time, following the contents list on this page. The search grows a stage
per chapter, and each stage is measured against the evaluation set.
