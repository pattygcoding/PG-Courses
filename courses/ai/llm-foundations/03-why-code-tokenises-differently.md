---
title: Why code tokenises differently
summary: Indentation, punctuation and identifiers, all measured.
chapter: Tokens
minutes: 12
status: draft
---

## Code is not prose

Prose repeats words, so words compress into tokens. Code repeats punctuation and shape, so punctuation
does not compress the same way, and a run of indentation arrives as a run of separate space tokens.

One line of code through the same encoder as the previous lesson:

```text
code: return { ok: false, reason: "no-copy" }
  characters 39, tokens 29
  "re" "turn" " " "{" " " "ok" ":" " f" "a" "l" "s" "e" "," " rea" "s" "o" "n" ":" " " "\"" "n" "o" "-" "co" "p" "y" "\"" " " "}"
```

Thirty-nine characters and twenty-nine tokens. The prose line in the previous lesson was forty-nine
characters for twenty-seven tokens, so this shorter line cost more. The braces, the colon, the quotes and
the hyphen each take a token, and one line holds seven of them.

## Whitespace is a token

The clearest demonstration is the same code written two ways:

```text
tight: "if(out>=book.copies){return}"
  tokens 22

spaced: "if (out >= book.copies) { return }"
  tokens 24
```

Two extra tokens for the spaces around the operators, which is the spacing style most projects use.
Nothing about the program changed. The bill did.

That is a small effect on one line and a real one across a repository. A formatter that adds spaces
everywhere adds tokens everywhere, and the cost of every future prompt that includes the file moves with
it.

## Identifiers are where it gets expensive

A common word is one token because the merges covered it. An identifier the corpus never held is split
into whatever pieces the merges allow, and a name built from several English words splits at the joins.

The advice here is not to shorten names for the model's benefit. It is to know that the count varies with
naming, so an estimate taken from characters alone will be wrong in both directions.

## Check yourself

Take three files from your project and count the tokens in each. Note the tokens per character for a file
of prose comments and for a file of dense code. Then change the spacing on one dense line and count
again.
