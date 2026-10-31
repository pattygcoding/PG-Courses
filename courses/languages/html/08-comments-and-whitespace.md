---
title: Comments and whitespace
summary: Notes the parser keeps and the space it throws away, which is the one place markup meets layout.
chapter: The syntax
minutes: 12
status: draft
---

## Comments

```html
<!-- A note for whoever reads the source -->
```

A comment starts with `<!--` and ends with the first `-->`. It is a node in the tree, which is why it can be found and why the
tree dump shows `#comment` where it sits:

```text
    <div>
      #text "Some text"
      #comment
      #text "More text"
```

A comment can contain anything except `-->`, and the restrictions that catch people are about the dashes:

| Written | Result |
| --- | --- |
| `<!-- a -- b -->` | valid in HTML, and the comment ends at `-->` |
| `<!-- a -- b -- >` | never ends, so the rest of the page is inside the comment |
| `<!---->` | an empty comment |
| `<!-->` | an empty comment too, because the tokenizer accepts it |

The second row is the failure mode worth knowing: a comment with a `--` inside it is legal and a comment that never closes swallows
the page. If the page below a comment has vanished, the comment is the first thing to check.

Two more rules that differ from other languages. Comments **do not nest**, so `<!-- a <!-- b -->` ends at the first `-->` and the
rest is text. And a comment inside a tag is a different thing entirely: `<div <!-- nope -->>` breaks the tag, because the tokenizer
is reading an attribute name at that point.

## What comments are for

- A note about why something is the way it is: a workaround, a phase of a migration, a value that came from somewhere odd.
- Marking the end of a long block, in a template that is hard to scan.
- Leaving a hook for a build step, such as a place a stylesheet is injected.

And what they are not for: hiding content from a reader. A comment is in the file, it is visible in the page source, and anything
that matters is either on the page or in version control. `<!-- TODO: fix this -->` in a template is a note nobody will read, and
in a rendered page it is a note a visitor can.

## Whitespace in the tree

```html
<p>one    two
      three</p>
<pre>one    two
      three</pre>
```

The same content twice, in a paragraph and in a `pre`. Asking the browser about both gives the same text and different layout:

```text
P ws:    raw="one    two\n      three"  collapsed="one two three"  white-space=normal
PRE pre: raw="one    two\n      three"  collapsed="one two three"  white-space=pre
```

Two facts, and the order matters. **The tree keeps every space and newline you wrote**, which is why `textContent` is exactly what
the source said. And **the rendering collapses runs of whitespace**, because `white-space` is `normal` by default, so the four
spaces between "one" and "two" are drawn as one.

That is the division: whitespace is data in the DOM and a collapsing policy in the rendering. The collapsing is defined in CSS,
which the CSS course covers, and the two things an HTML author needs from it are the next two sections.

## The spaces that matter

Whitespace is preserved in the tree, so it can matter even when it is not drawn:

- **Between inline elements**, a space in the source is a space on the page: `<a>one</a> <a>two</a>` has a gap and
  `<a>one</a><a>two</a>` does not. A newline between them counts as a space, which is why a list of links written one per line
  has gaps and the same list written on one line does not.
- **In an attribute value**, whitespace is preserved exactly and is never collapsed, so `class=" a  b "` is three classes
  according to the rules for a space-separated list and only two according to a naive split.
- **Around a `pre`**, the newline before the text and after it are both real, which is why a `pre` element is usually written with
  its content beginning immediately after the opening tag.

## The elements that change it

| Element | Effect |
| --- | --- |
| `pre` | `white-space: pre`, so the text is laid out as written |
| `textarea` | the same for a form control |
| `br` | a line break, which is content rather than layout |
| `wbr` | a place where a long word may break, which changes nothing unless the line ends there |

`<pre>` is the element for content whose spacing is part of its meaning: code, an ASCII diagram, a poem. It is also the element
that gets used badly most often, because it disables the wrapping that makes text readable on a narrow screen. The rule I follow:
`<pre>` for content where the columns carry meaning, `<code>` for the rest, and CSS for anything that is only about layout.

```html
<pre><code>SELECT title
FROM book
WHERE pages &gt; 300;</code></pre>
```

That pairing is the one you will see most: `pre` for the spacing and `code` for the meaning, with the `<` and `>` escaped because
`pre` does not change the parsing rules.

## Newlines and the elements that keep them

Three places where a newline in the source has an effect beyond a collapsed space:

- **In a `pre` or a `textarea`**, every newline is a line break.
- **In a comment**, newlines are part of the comment and change nothing else.
- **After `<!doctype html>`**, a newline is required by the style guide and has no effect on the tree.

Everywhere else, a newline is a space for layout and a detail of formatting for the reader. That is why a template that indents
its output is free to indent it, with the two exceptions above.

## Check yourself

Write a comment containing a `--` and confirm the page still renders, then write one with an unterminated `<!--` and find where
the page went. Put the same text in a `p` and a `pre` and compare `textContent` with what is drawn. Finish by putting two links on
separate lines and then on one line, and explaining the gap.
