---
title: How HTML is parsed
summary: Two stages, one recovery rule, and the trees that come out of markup nobody meant to write.
chapter: Getting started
minutes: 14
status: draft
---

## Two stages

A browser turns bytes into a tree in two stages, and knowing which stage is which explains every surprise:

1. **The tokenizer** reads characters and produces tokens: a start tag, an end tag, a run of text, a comment, a character
   reference. It is the stage that handles quoting, attribute names and entities.
2. **The tree builder** takes those tokens and builds the document, deciding where each token's element goes and what to do when
   the sequence does not make sense.

The tokenizer is mostly unremarkable. The tree builder is where HTML differs from every other language you have used, because it
has a rule for every possible sequence of tokens and none of those rules is "stop and report an error".

## Start tags, end tags and void elements

```html
<img src="cover.png" alt="A cover">
<br>
<input type="text" name="q">
```

Three elements that take no closing tag. They are **void elements**, a fixed list, and `</img>` is not merely unnecessary but wrong:
the tokenizer produces an end tag for `img` and the tree builder ignores it, because there is no open element for it to close.

The void elements are worth knowing as a set: `area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `source`,
`track` and `wbr`. Everything else takes a closing tag, and a self-closing slash is decoration rather than a substitute:

```html
<div />
```

That is a start tag for `div` and the `/` is ignored with a parse error. A `<div />` in an HTML document opens a div and never
closes it, which is why HTML written as if it were XML produces trees nobody expects.

## The adoption agency, or misnested tags

```html
<p>An <em>emphasis<strong>and strong</em> then stray</strong></p>
```

An `<em>` and a `<strong>` interleaved with each other, which no tree can represent. The parser does not fail; it produces this:

```text
    <p>
      #text "An"
      <em>
        #text "emphasis"
        <strong>
          #text "and strong"
      <strong>
        #text "then stray"
```

The `</em>` closed the `em`, closing the `strong` inside it, and then the parser **created a new `strong`** for the content that
followed. One `<strong>` start tag became two elements, and `p` has two element children where the markup suggested a nesting. The
algorithm that does this has the memorable name "the adoption agency", and it exists so that formatting elements survive content
that is not properly nested.

The practical rule: an `<em>` inside a `<strong>` is fine, an interleaved pair is not, and the parser invents elements to make it
work.

## Foster parenting, or content in a table

```html
<table>
  <div>Not allowed inside a table</div>
  <tr><td>a<td>b</tr>
</table>
```

```text
    <div>
      #text "Not allowed inside a table"
    <table>
      <tbody>
        <tr>
          <td>
            #text "a"
          <td>
            #text "b"
```

The `div` was **moved out of the table and placed before it**. A table's tree may contain only table parts, so the parser takes
anything else and puts it immediately before the table, which is called foster parenting. The content is not lost and it is not
where you wrote it.

Two other things happened in that example. A `<tbody>` appeared, which nobody wrote, because a table row must have a parent body.
And the second `<td>` began without closing the first, which the parser handled by closing it.

Foster parenting is why a table used for page layout, which was common for a decade, is a bad idea beyond the accessibility
problem: content that is not table content does not stay inside the table.

## Optional end tags and implied elements

```html
<ul>
  <li>one
  <li>two
</ul>
```

```text
    <ul>
      <li>
        #text "one"
      <li>
        #text "two"
```

Two `li` elements from one `</li>`. The end tag of an `li` is **optional** when the next thing is another `li`, or the parent's end
tag, and the parser closes the first when it sees the second. The same applies to `p`, `dt`, `dd`, `option`, `thead`, `tbody` and a
handful of others, each with its own rule about what closes it.

Those rules are what makes hand-written HTML work at all, and they also hide a mistake: a missing `</ul>` means the parser closes
the list at whatever comes next, so a following item can end up as a sibling of the list rather than inside it.

## Attribute surprises

```html
<div class="a" class="b">Two class attributes</div>
<img src="x.png" alt="" /">
```

```text
    <div class="a">
      #text "Two class attributes"
    <img src="x.png" alt="" "="">
```

Two verified behaviours that both surprise people. A duplicate attribute is a parse error and **the first one wins**, so the class
is `"a"` and `"b"` is discarded. And `alt="" /` produced an attribute **named `"` with an empty value**, because the tokenizer was
inside an unquoted attribute value and a `/` does not end one.

## What the errors look like

The standard reports parse errors as the tree is built, and a parser that surfaces them gives you a list:

```text
parse errors: 3
  duplicate-attribute at line 6, col 25
  unexpected-solidus-in-tag at line 7, col 30
  unexpected-character-in-attribute-name at line 7, col 30
```

Those three are the tokenizer-level problems from the examples above: the duplicate attribute, and the two from the stray `/`. The
structural problems from earlier on this page do **not** appear, because the errors it reports are the ones the tokenizer can name
at the point it reads them. A misnested tag and foster parenting are decisions the tree builder made.

So a clean parse-error list is not the same as a conforming document. The full check is a validator, which walks the tree against
the content models, and the last chapter of this course uses one.

## Check yourself

Write a page with an interleaved `<em>` and `<strong>` and read the tree the parser builds. Put a `<div>` inside a `<table>` and
find where it went. Then remove a `</li>` and a `</ul>` from a list and see what the parser did with the items after them.
