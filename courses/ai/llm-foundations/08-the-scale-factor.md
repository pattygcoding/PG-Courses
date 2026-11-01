---
title: The scale factor
summary: Why the dot products are divided by the square root of the dimension.
chapter: The transformer
minutes: 12
status: draft
---

## The formula

Scaled dot-product attention is three lines, and the divisor in the middle looks like a detail:

```text
scores  = Q dot K^T / sqrt(d)
weights = softmax(scores)
output  = weights dot V
```

That divisor is load bearing. Without it, the softmax saturates as the dimension grows, so one token takes
almost all of the weight and the rest of the row collapses towards zero. A saturated row means the block
stops mixing information between positions, which is the thing attention exists to do.

## Measuring the saturation

Eight keys and one query, with vectors of several dimensions. The table shows the highest and lowest weight
in the row, with and without the divisor:

```text
eight keys, one query, the highest and lowest weight in the row:
  d =  2   unscaled max 0.144 min 0.1157   scaled max 0.138 min 0.1184
  d =  8   unscaled max 0.202 min 0.0564   scaled max 0.151 min 0.0959
  d = 32   unscaled max 0.529 min 0.0027   scaled max 0.191 min 0.0749
  d = 64   unscaled max 0.419 min 0.0039   scaled max 0.156 min 0.0866
```

At two dimensions the two columns are almost identical. At thirty-two, the unscaled row has one token at
0.529 and another at 0.0027, while the scaled row keeps every weight between 0.075 and 0.191. That is the
saturation, and it is invisible at the small dimension where attention is usually first written.

## Where the growth comes from

A dot product of two unit vectors in random directions has an expected value of zero and a variance that
grows in proportion to the dimension. The typical absolute score therefore grows with the square root of
`d`, which is what the divisor cancels.

That is the whole argument, and it is worth following rather than memorising, because the same reasoning
applies wherever a sum over many dimensions is fed into a softmax.

## What to do with it

If you write attention yourself, keep the divisor and check it by measurement. Raise the dimension in a
test and confirm the weights stay spread out. A row that is one-hot at a dimension of sixty-four is a bug
rather than a sharp model.

## Check yourself

Run the measurement above for a dimension not in the table. Then remove the divisor, run again, and write
down the dimension at which the highest weight passes 0.4.
