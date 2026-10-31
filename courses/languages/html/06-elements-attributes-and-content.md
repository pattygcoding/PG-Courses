---
title: Elements, attributes and content
summary: The five ways to write an attribute, the ones with no value, and the characters that mean something.
chapter: The syntax
minutes: 14
status: draft
---

## Text, elements and comments

```html
<div class="card">
  <h2>A book</h2>
  <p>On loan until the 12th.</p>
  <!-- A note for whoever reads the source -->
</div>
```

Three kinds of node. The `div` is an element with three children: an `h2`, a `p` and a comment. The text inside the `p` is a node
of its own, and so is the whitespace between the tags, which is why a tree dump shows `#text` entries that correspond to nothing
you would point at on the page.

Element names are case-insensitive, and attribute names are too. Writing them in uppercase works, and the DOM normalises both:

```html
<DIV CLASS="Upper" DATA-Count="7" id="mixed">Mixed case</DIV>
```

```text
DIV mixed: class="Upper" data-count="7" id="mixed"
```

Two things to read from that. The attribute **names** came back lowercase, so `CLASS` and `DATA-Count` are the same attributes as
`class` and `data-count`. The attribute **values** kept their case, because `"Upper"` is data and HTML does not touch data. And the
element's `tagName` property is uppercase `DIV` even though the tree holds a lowercase `div`, because in an HTML document
`tagName` returns the uppercase form and `localName` returns the lowercase one.

A duplicate is worth noticing too. `DATA-Count="7"` and `data-count="8"` are the same attribute spelled twice, so one is a parse
error and **the first one wins**: the element has `data-count="7"` and the `8` is gone.

## Five ways to write an attribute

```html
<p title="double quoted">One</p>
<p title='single quoted'>Two</p>
<p title=unquoted>Three</p>
<p title="">Four</p>
<p title>Five</p>
```

All five are valid and all five produce the same attribute in the tree:

```text
    <p title="double quoted">
      #text "One"
    <p title="single quoted">
      #text "Two"
    <p title="unquoted">
      #text "Three"
    <p title="">
      #text "Four"
    <p title="">
      #text "Five"
```

Two conclusions. **Single quotes are legal**, so a value containing a double quote needs no entity:

```html
<p title='He said "hello"'>A title</p>
```

And **an attribute with no value at all is an empty string**, so `title` and `title=""` are the same thing. That looks like a
mistake and it is exactly the mechanism the next section depends on.

Unquoted values are legal as long as they contain no space, no quote, no `=`, no `<`, no `>` and no backtick. They are a bad habit
because the day a space creeps into the value, the attribute becomes two attributes and the parser splits it without a word.

## Boolean attributes

```html
<input type="checkbox" checked disabled>
<input type="text" required>
```

```text
INPUT checkbox: checked=true disabled=true valid=true
```

Three attributes with no value and no need for one. They are **boolean attributes**: the presence of the attribute is the value,
and the legal values are the empty string and the attribute's own name. So `checked`, `checked=""` and `checked="checked"` are all
the same, and `checked="false"` is a trap, because a present attribute is true whatever it says:

| Written | Effect |
| --- | --- |
| `checked` | checked |
| `checked=""` | checked |
| `checked="checked"` | checked |
| `checked="false"` | **checked**, because the attribute is present |
| *(nothing)* | not checked |

The boolean attributes you will meet most: `checked`, `disabled`, `required`, `readonly`, `multiple`, `selected`, `hidden`, `open`,
`autofocus`, `novalidate`, `loop`, `muted`, `controls` and `reversed`. A validator rejects any value other than the empty string
or the name itself, which is how `checked="false"` gets caught.

## The characters that mean something

Four characters have meaning in HTML, and five inside an attribute value. The safe versions are character references:

```html
&amp; &lt; &gt; &quot; &#39; &copy; &nbsp;
```

Read as code points, which is the only way to see the difference between some of these and their ASCII lookalikes:

```text
0026 0020 003c 0020 003e 0020 0022 0020 0027 0020 00a9 0020 00a0
```

So `&amp;` is U+0026, `&copy;` is U+00A9, and `&nbsp;` is U+00A0, which is **not** the space character. That distinction has a
visible effect, because a no-break space will not be broken across a line:

```text
a&nbsp;b -> 0061 00a0 0062
```

The five you should always reference rather than write:

| Character | Reference | Why |
| --- | --- | --- |
| `&` | `&amp;` | starts a reference, so a bare one is ambiguous |
| `<` | `&lt;` | starts a tag |
| `>` | `&gt;` | ends a tag, and safe in text but best referenced |
| `"` | `&quot;` | ends a double-quoted attribute value |
| `'` | `&#39;` | ends a single-quoted attribute value, and has no name |

There is a long list of named references, and the practical rule is to use the handful above and let a validator complain about the
rest. Guessing at a name is the usual mistake: `&apos;` exists in XML and **not** in HTML, where the apostrophe is `&#39;`.

## When `<` does not start a tag

```html
<p>5 < 6 & 7 > 4</p>
```

```text
    <p id="plain">
      #text "5 < 6 & 7 > 4"
```

Every character survived. A `<` only starts a tag when it is followed by a letter, a `/`, a `!` or a `?`, so `< 6` is text and
`<b` would have started an element. That is a precise rule rather than a fuzzy one, and it explains why so much sloppy markup
works: the dangerous cases are narrower than they look.

Four elements have what the standard calls raw text content, and inside them the rule changes:

```html
<title>A < b & c</title>
<textarea>A &amp; B &lt;/textarea&gt; C</textarea>
<script>const x = "<div>not an element";</script>
```

```text
    <title>
      #text "A < b & c"
    <textarea id="ta">
      #text "A & B </textarea> C"
    <script>
      #text "const x = "<div>not an element";"
```

| Element | Content | Consequence |
| --- | --- | --- |
| `script`, `style` | raw text, no references | a `</script>` in a string ends the script |
| `textarea`, `title` | escapable raw text | `&lt;` becomes `<`, and `<` stays text |
| everything else | normal content | a letter after `<` starts an element |

The `textarea` line is the interesting one: the entities were decoded, so the element's text content is a literal
`</textarea>` written as text without closing itself. That is the technique for showing markup inside a textarea, and the
reason a textarea can hold code.

## Check yourself

Write one element with double-quoted, single-quoted and unquoted attributes and inspect the tree to confirm they are the same.
Write a boolean attribute with `="false"` and check the element's state in the browser to confirm it is on. Then put a literal `&`
and a literal `<` in some text, look at the tree, and fix both with references.
