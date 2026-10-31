---
title: What the parser forgives
summary: The difference between markup that works, markup that is valid, and markup a reader can follow.
chapter: The syntax
minutes: 12
status: draft
---

## Three different questions

By now the distinction is worth stating plainly, because it explains most of what is confusing about HTML:

| Question | Answered by |
| --- | --- |
| does it render? | any browser, always |
| is it valid? | a validator, against the content models |
| can a person and a machine follow it? | a style guide, and testing with a screen reader |

The first is the only one a browser will tell you about, and it says yes to everything. The second and third are the ones that
decide whether the page keeps working, and the tools for them are later in this course.

## What the parser repairs silently

Every one of these is valid input as far as the parser is concerned, and every one is wrong:

| Written | Repaired to |
| --- | --- |
| `<p>one<div>two</div></p>` | the paragraph is closed at the `div` and a second empty `p` is invented |
| `<div class="a" class="b">` | `class="a"`, with the second attribute discarded |
| `<DIV CLASS="x">` | `<div class="x">` |
| `<ul><li>one<li>two</ul>` | two `li` elements |
| `<table><div>x</div></table>` | the `div` moved before the table |
| `<button>` inside `<a>` | kept as written, and invalid |
| `<div>` inside `<span>` | kept as written, and invalid |
| `<td>` outside a table | the tags ignored, the text kept |
| `<div />` | a `div` opened and never closed |

The list is worth reading as a pair of columns: the left is what you wrote, the right is what the browser has. When a page behaves
oddly, the right column is the thing to look at, and the browser's inspector shows it.

## What a validator will tell you

A validator walks the tree against the content models and reports rules the parser does not enforce: a `div` inside a `span`, a
`button` inside an `a`, a `ul` containing anything but `li`, a duplicate `id`, a `checked="false"`, a missing `alt`, a heading
jumped from `h1` to `h4`. Those are the errors the parser cannot see because they do not change the tree.

The division is worth having exactly right:

- **The parser enforces what it needs to build a tree.** A content model that would change the tree's shape is enforced, and the
  rest are not.
- **The validator enforces everything.** It has no tree to build, so it can afford to check every rule.

The last chapter of this course runs one.

## The style guide I follow

The rules below are conventions rather than requirements, and they exist because a page is read far more often than it is written.

**Lowercase and quoted.** Element names in lowercase, and attribute values always in double quotes. Both are optional and both
remove a decision the next reader has to make.

```html
<div class="card" data-id="7">
```

**One element per line** when an element has element children, and inline content left alone:

```html
<ul>
  <li>An item</li>
  <li>Another item</li>
</ul>
```

**Indent consistently**, two spaces. The browser does not care and the reader's eye does.

**Close everything that can be closed**, even where the end tag is optional. `</li>` and `</p>` are optional and writing them
costs one line and removes the need to know which ones are optional.

**Attributes in a consistent order**: `id`, then `class`, then the element's own attributes, then `data-`. A consistent order makes
a diff show what changed rather than where it moved.

**One `h1` per page and no skipped levels.** The heading order is the outline a screen reader navigates by, and the next chapter
covers it.

**No `style` attributes and no `on*` attributes.** They mix the three languages of a page together, which is the thing a style
guide is for.

## The four habits that prevent the interesting problems

1. **Look at the tree, not the source.** When something is wrong, the inspector shows what the browser built, and it is the only
   view that matters.
2. **Validate before shipping.** A validator catches the class of error the browser hides, and it takes a second.
3. **Test with the keyboard.** Tab through the page. If the order is wrong or you cannot reach something, no amount of markup
   tidying will have found it.
4. **Read it aloud with a screen reader**, once, on a form. It is uncomfortable and it is the fastest way to find out that a
   label is wrong.

## Check yourself

Deliberately break a page four ways from the table at the top of this page and write down what the parser produced for each. Then
run the same page through a validator and list the errors the parser did not report. Finish by taking a page you have and applying
the six conventions above to it.
