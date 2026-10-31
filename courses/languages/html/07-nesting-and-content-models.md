---
title: Nesting and content models
summary: What may contain what, the two rules the parser enforces, and the one it leaves to a validator.
chapter: The syntax
minutes: 13
status: draft
---

## An element declares what it accepts

Every element has a **content model**: a rule about what may be inside it. Four of them cover almost everything:

| Category | Accepts | Examples |
| --- | --- | --- |
| metadata | information about the document | `head`, `meta`, `title`, `link` |
| flow | the body's default content | `div`, `p`, `ul`, `section`, `h1` |
| phrasing | text and what sits inside a line | `span`, `em`, `a`, `img`, `code` |
| heading | an `h1` to `h6`, used inside a section | `h1`, `h2` |

The categories nest: phrasing content is flow content, metadata is not. So a `p` accepts phrasing, a `div` accepts flow, and a
`span` accepts phrasing, which is why a `div` inside a `span` is invalid and a `div` inside a `div` is not.

## The rule the parser enforces

```html
<p>one<div>a div</div>three</p>
```

A `div` is flow content and a `p` accepts phrasing, so this is invalid. The parser knows the rule and repairs it:

```text
    <p id="pcase">
      #text "one"
    <div>
      #text "a div"
    #text "three"
    <p>
```

Read that carefully, because three things happened. The `div` **closed the `p`**, so the `p` holds only "one". The text "three"
became a text node in the body, outside any paragraph, and the `</p>` at the end had no open `p` to close, so the parser
**created an empty `<p>`** for it.

Nothing was reported. A browser will not tell you, and the page will look like two paragraphs and a block, or like something else
depending on the CSS. This is the single most common structural bug in hand-written HTML, and the parser's silent repair is why it
is hard to notice.

## The rule the parser does not enforce

```html
<ul><div>a div in a list</div><li>an item</li></ul>
<span><div>a div in a span</div></span>
<a href="one"><button>A button in a link</button></a>
```

```text
    <ul id="ulcase">
      <div>
        #text "a div in a list"
      <li>
        #text "an item"
    <span id="spancase">
      <div>
        #text "a div in a span"
    <a href="one" id="acase">
      <button type="button" id="binside">
        #text "A button in a link"
```

All three survived exactly as written, and all three break a content model. A `ul` may contain only `li`, `script` and
`template`; a `span` may contain only phrasing content; and an `a` may contain no interactive content, which a `button` is.

So the tree builder enforces some content models and not others. The ones it enforces are the ones where a rule changes how the
tree is built, and the rest are left to a validator. That is the division that explains why "the browser renders it fine" is not
evidence that the markup is right.

## The nesting mistakes that matter

The parser repairs them, so what makes one mistake worse than another is what the repair does to the rest of the page:

| Written | What happens |
| --- | --- |
| a `div` inside a `p` | the paragraph is split and the rest of the page is unparented |
| an `a` inside an `a` | the first link ends, so one link becomes two |
| a `button` inside a `button` | the outer button closes, and its remaining content is outside it |
| an `li` outside a list | it stays where you put it, with no list semantics |
| a `tr` outside a table | the row's tags are ignored and its cells become text |

The last two are worth seeing, because the repair is different for each:

```html
<li>An item with no list</li>
<td>A cell with no table</td>
```

```text
    <li id="loose">
      #text "An item with no list"
    #text "A cell with no table"
```

The `li` was created and kept in the body with no list around it, which is valid HTML with no list semantics: a screen reader
announces the text and not "item 1 of 1". The `td` is the opposite case, because a cell is only a cell inside a table: **the cell
tags were ignored and the text became plain text**. The element vanished and its content stayed.

## Interactive content

The one rule worth memorising beyond the categories is that **interactive content cannot nest**. Interactive elements are `a`,
`button`, `input`, `select`, `textarea`, `details`, `summary`, `label` and anything with a `tabindex`.

That rules out a button inside a link, a link inside a button, a link inside a label, and a label wrapping a link. All four are
attempts at the same design: something that looks like one control and responds to two actions. The accessible name of the outer
control absorbs the inner one, the keyboard has one focus stop for two actions, and a screen reader reads the concatenation.

Where two actions are needed, they are two controls side by side:

```html
<a href="/books/1">The Left Hand of Darkness</a>
<button type="button">Borrow</button>
```

Two focus stops, two names, two behaviours, and neither one announces the other's text.

## The skeleton that satisfies the models

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>A page</title>
  </head>
  <body>
    <main>
      <h1>A page</h1>
      <p>Text, and <a href="/books">a link</a> inside the text.</p>
      <ul>
        <li>An item</li>
        <li>Another item</li>
      </ul>
    </main>
  </body>
</html>
```

Every element here is in a legal position, and it reads as a summary of the rules: metadata in the head, a single `h1` in the
`main`, paragraphs and lists as flow content, and phrasing content inside them. A page built from that shape has no content model
to break.

## Check yourself

Write a `div` inside a `p` and read the tree to find where the paragraph ended. Then put a `div` inside a `span`, a `button`
inside an `a` and a `td` outside a table, and check each in a browser. Finish by writing down which of those four a validator
would reject.
