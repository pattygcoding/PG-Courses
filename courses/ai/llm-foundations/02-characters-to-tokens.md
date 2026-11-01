---
title: Characters to tokens
summary: Byte-pair encoding, built here so the merges can be printed.
chapter: Tokens
minutes: 13
status: draft
---

## Tokens are not words

A token is a chunk of text from a fixed vocabulary the model was trained with. Common words are one
token. Longer or rarer words are several. Punctuation, indentation and spaces are tokens of their own.

The scheme is byte-pair encoding. Start with single characters. Count every adjacent pair in the corpus.
Merge the most frequent pair into one symbol, and repeat. After enough rounds, the frequent chunks of
your text are single tokens.

## The first merges

The first merges are easy to predict, and this is a real run over a corpus of prose and code lines:

```text
merges learned, in order:
  "r" + "e"  seen 8 times
  "l" + "o"  seen 8 times
  "a" + "n"  seen 6 times
  " " + "re"  seen 6 times
  "e" + "r"  seen 6 times
  " " + "b"  seen 6 times
  "o" + "k"  seen 6 times
  "u" + "e"  seen 6 times
  ... 24 rules in total
```

Two things to notice. The merges are pairs of symbols, so the vocabulary is built from what appears in
the text rather than from a dictionary. And the leading space is part of the token, which is why
`" rea"` appears below rather than `"rea"`.

## Applying the merges

Encoding is the same rules applied in the order they were learned:

```text
prose: The reader returned the book before the due date.
  characters 49, tokens 27
  "T" "he" " rea" "d" "er" " re" "turn" "e" "d" " " "t" "he" " book" " b" "e" "f" "o" "re" " " "t" "he" " d" "ue" " d" "at" "e" "."
```

Twenty-seven tokens for forty-nine characters, so the average token is under two characters here. A
production tokeniser is trained on far more text and reaches a better ratio on ordinary prose. What
matters in that output is the mechanism, not the exact numbers.

## Why an unusual word costs more

A word the training text contained often becomes a single token. A word it never contained is split into
whatever pieces the merges allow, which is why an identifier nobody has written before costs several
tokens while a short common word costs one. That asymmetry is why a name like `catalogueAvailability`
costs more than `books`.

## Check yourself

Write the same idea twice, once with names from your domain and once with short generic names. Encode
both with a tokeniser and compare the counts. Then find the longest identifier in your project and count
its tokens.
