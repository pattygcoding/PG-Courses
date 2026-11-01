---
title: Attention weights
summary: Every token weighs every other token, and the weights can be printed.
chapter: The transformer
minutes: 13
status: draft
---

## The mechanism

Attention lets each token decide how much of every other token to take into its own representation. Three
vectors are derived from each token: a query, a key and a value. A token's output is a weighted sum of all
the values, where the weight on a value comes from the similarity between this token's query and that
token's key.

Nothing is learned per pair. The projections that produce the three vectors are learned, and the weights
then fall out of the arithmetic.

## Printing the weights

Four tokens, three dimensions per vector, and hand-written projections so the arithmetic stays readable:

```text
unscaled
               the librarian   renewed        it
  the        0.109     0.297     0.297     0.297
  librarian     0.000     0.950     0.002     0.047
  renewed     0.012     0.657     0.089     0.242
  it         0.002     0.865     0.016     0.117
```

Read one row at a time. The second row says that `librarian`, forming its output, takes 0.95 of its
content from itself and almost nothing from `renewed`. The fourth row says that `it` takes 0.865 from
`librarian`, which is the behaviour people describe as a pronoun attending to what it refers to.

The projections in a trained model are learned rather than chosen, so real weights differ from these. What
is real in this table is the shape of the computation and the fact that each row is a distribution.

## Rows sum to one

A softmax runs across each row, which makes the weights a distribution over the tokens:

```text
row sums, which should each be 1:
  unscaled: 1.000, 1.000, 1.000, 1.000
  scaled: 1.000, 1.000, 1.000, 1.000
```

That check is worth running whenever you implement attention yourself. A row that does not sum to one
almost always means the softmax is over the wrong axis, or the mask is wrong.

## Attention is not an explanation

It is tempting to read these weights as the model's reasons for an answer. The row above is suggestive and
it is not evidence. A high weight means one token contributed more of its value to that position, and the
same output can be reached through different patterns in different layers. Treat the picture as a
diagnostic rather than as a justification.

## Check yourself

Implement the three projections for four tokens of your own, print the matrix, and check the row sums. Then
pick the row you find most surprising and write down what the input tokens would have to look like for
that weight to be lower.
