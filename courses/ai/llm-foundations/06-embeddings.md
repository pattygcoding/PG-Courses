---
title: Embeddings
summary: Text becomes a list of numbers, and distance starts to mean something.
chapter: The transformer
minutes: 12
status: draft
---

## From token to vector

Every token in the vocabulary has a vector, several thousand numbers long in a large model. Look up the
token's id and you get its vector. That table is the embedding matrix, and it is one of the few parts of
a model you can inspect directly.

No single coordinate has a meaning a person can read. What matters is the geometry: tokens used in similar
company end up near each other, which is why arithmetic on these vectors behaves the way it does.

## Position has to be added

Attention, the next lesson, has no sense of order in itself. It compares tokens with each other and would
give the same answer for a shuffled sentence. So a second vector is added to each token's embedding to
encode where the token sits, and the sum is what the first block sees.

That is where a maximum context length comes from. The position encoding has to be defined for every
position the model might see, and the scheme was built for a fixed range.

## The geometry

With vectors in hand, comparing two tokens is a dot product, and the useful property is that similarity in
the space tracks similarity in use. Two words that appear in similar company end up with a high dot
product, and two words that never do rarely share a direction.

The famous demonstration is that a direction in the space carries a consistent meaning. Take the vector
for `man` away from `king`, add `woman`, and the nearest token is usually `queen`. The same trick works for
verb tense and for country and capital. Those examples come from particular trained models and particular
prompts, so expect the effect rather than the exact result.

## Why this reaches your code

Two consequences arrive at the application layer. Embeddings are what makes search by meaning possible,
which is the subject of a whole other course in this section. And the embedding table is usually left
alone by a fine-tuning job, which is worth knowing before you pay for one.

## Check yourself

Take three words from your domain, two related and one unrelated, and write down which you expect to be
closest in embedding space before you look. Then compute the three similarities with an embedding endpoint
and compare the result with your prediction.
