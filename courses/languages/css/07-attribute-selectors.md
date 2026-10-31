---
title: Attribute selectors
summary: Select by an attribute, by a word in it, by a prefix or a suffix, and the case flag that works.
chapter: Selectors and the cascade
minutes: 13
status: draft
---

## Presence and exact value

```css
[title]            { }   /* has a title attribute, whatever its value */
[title='hello']    { }   /* the value is exactly "hello"             */
[title='']         { }   /* the attribute exists and is empty        */
```

```text
count [title]        -> 2
count [title='hello'] -> 1
count [title='']     -> 1
```

Three separate ideas and all three are useful. `[title]` is the presence test and it matched two elements, one of which has an empty value, because an attribute that exists with no value still exists. `[title='']` is how you find exactly that case.

The value in an attribute selector is case-sensitive in an HTML document:

```text
count a[href$='.pdf'] -> 1
count [data-probe='A'] -> 1
count [data-probe='a'] -> 0
```

There is one element with `href="Report.PDF"` and one with `href="report.pdf"`, and the lowercase selector matched once. The same applies to a `data-` attribute: `'A'` and `'a'` are different values.

## The case-insensitive flag

Every attribute selector takes an optional flag after the value, and `i` makes the comparison case-insensitive:

```text
count a[href$='.pdf' i] -> 2
count input[type='text' i] -> 1
supports selector([class~='card' i]) -> true
```

Two matches instead of one, and the flag is supported here. The `s` flag is the opposite, forcing a case-sensitive comparison, and it is worth checking rather than assuming because this build of Chrome does not implement it:

```text
supports selector([title='hello' s]) -> false
count [title='hello' s] -> INVALID SELECTOR (SyntaxError)
```

The whole selector is rejected, so a rule using `s` is dropped and an equivalent `querySelector` call throws. If you need case-sensitive matching, the default behaviour already gives it to you and `s` adds nothing.

## The five substring operators

| Selector | Means | Matched |
| --- | --- | --- |
| `[class~='card']` | the value is a list containing the word `card` | 2 |
| `[class~='car']` | a complete word `car` | 0 |
| `[class*='card']` | the value contains the substring `card` | 3 |
| `[class^='card']` | the value starts with `card` | 3 |
| `[class|='card']` | the value is `card`, or starts with `card-` | 1 |

The markup behind those numbers is three elements with `class="card"`, `class="card wide"` and `class="cardigan"`.

`~=` and `=` look similar and behave very differently: `~=` splits the value on whitespace and compares whole words, which is why `[class~='card']` matched two and `[class~='car']` matched none. `*=` is a plain substring test, so it caught `cardigan` as well. When the attribute is `class`, `.card` is the readable form of `[class~='card']` and matches exactly the same elements, and I use it.

`|=` is rarer and it is the one to reach for with anything that has a namespace-like value:

```text
count [lang|='en'] -> 3
count [lang|='en-GB'] -> 1
```

Three elements: `<html lang="en">`, `lang="en-GB"` and `lang="en"`. The value `engb` has no separator and did not match, so `|=` matched `en` exactly and `en-GB` through its prefix. The convention comes from XML languages, where a value's first segment is the base.

## Practical uses

**Links by scheme.** `[href^='http']` matched the one absolute external link, `[href^='mailto:']` matched the mail link, and `[href^='/']` matched the one internal path. Those three are how a stylesheet marks external and internal links differently without adding a class to every anchor.

**File types.** `[href$='.pdf']` is a common one and a good argument for the `i` flag, because a filename's extension is often capitalised by whoever uploaded the file.

**Form inputs by type.** `input[type='email']`, `input[type='text']`, `input[type='checkbox']` and the rest let you style each kind of control without classes. This is the selector that makes a form look deliberate, because the browser's own controls differ wildly in size and it is the `type` attribute that tells you which is which.

**Your own data.** `[data-state='open']` is a class in a different suit: it selects on an attribute your markup owns, and it cannot collide with a presentational class name. Which to use is a real choice. Use a class when the variation is about how the element should look, and a data attribute when the element is reporting a fact about itself that the styling, the script and the test all need to agree on. The HTML course covers the `data-*` rules from the markup side.

A selector combination worth knowing: `p:not([class])` matched three of the paragraphs, which is a way to find elements that no one has classified. It is useful when auditing markup rather than when styling it.

## Check yourself

Write selectors that match a link ending in `.png`, a link that is external, an `input` of type `checkbox`, and an element whose `title` contains a word. Then work out which of the four needs the `i` flag and why. Finish by explaining why `[class~='card']` and `[class*='card']` give different answers on `class="cardigan"`.
