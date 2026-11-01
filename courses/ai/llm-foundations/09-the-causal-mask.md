---
title: The causal mask
summary: A token may look back and never forward, which is what makes generation possible.
chapter: The transformer
minutes: 12
status: draft
---

## Why the mask exists

A model predicting the next token must not read the token it is predicting. If it could, training would be
trivial and the model would be useless at inference, because the answer is not there yet.

The fix is a mask applied to the score matrix before the softmax. For token `i`, every position `j` where
`j > i` is set to negative infinity, so its weight comes out as zero.

## What the mask changes

The same four tokens, masked and unmasked:

```text
scaled, with a causal mask
               the librarian   renewed        it
  the        1.000     0.000     0.000     0.000
  librarian     0.001     0.999     0.000     0.000
  renewed     0.045     0.768     0.187     0.000
  it         0.011     0.760     0.045     0.185
```

Compare the second row with the unmasked version in the previous lesson, where `librarian` gave 0.047 to
`it`, a token that comes later. With the mask that weight is zero and the remaining mass is redistributed,
which is why `librarian` now takes 0.999 from itself. The same happens on the third row, where the 0.275
that went to `it` is spread over the three tokens that precede it.

The last row is unchanged, because the final token has nothing ahead of it to mask.

## Where the mask is not used

Reading a whole document with both directions visible is bidirectional attention, and it is what an
encoder-only model does. Those models are good at classification and retrieval and cannot generate text,
because generation needs the guarantee that position `i` never depended on a position after it.

A decoder-only model, which is what a coding assistant uses, keeps the mask in training and at inference.

## The efficiency point

During training the whole sequence is present, so the mask is applied once over the full matrix. At
inference only one new row is needed, and the keys and values of the earlier tokens are reused, which is
why a cache of them exists and why the first token of an answer costs more than the ones after it.

## Check yourself

Apply the mask to a four-token example of your own and check that every entry above the diagonal is zero.
Then remove the mask and say which rows change, and why the final row cannot.
