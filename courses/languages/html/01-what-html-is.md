---
title: What HTML is
summary: Text with tags, the tree the browser builds from it, and the three languages a page is made of.
chapter: Getting started
minutes: 12
status: draft
---

## Text with tags

```html
<h1>Library</h1>
<p>Books, members and loans.</p>
```

That is a heading and a paragraph, and the tags are what say so. HTML is a markup language: the content is text, and the tags
describe what the text is rather than how it should look. `<h1>` means "the most important heading here", and every browser
chooses to draw it large and bold, which is a decision the browser made and not one the markup asked for.

The distinction matters more than it sounds. A document full of `<div>` elements with class names is a document with no meaning in
it, and everything that reads a page for something other than its appearance, which is a screen reader, a search engine and a
reader mode, gets nothing from it.

## The browser builds a tree

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Library</title>
  </head>
  <body>
    <h1>Library</h1>
    <p>Books, members and loans.</p>
  </body>
</html>
```

Save that as `index.html` and open it in a browser. What the browser holds afterwards is not the text: it is a tree of nodes, and
the same tree is what I get by parsing the file:

```text
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>
      #text "Library"
  <body>
    <h1>
      #text "Library"
    <p>
      #text "Books, members and loans."
```

That is the output of a parser reading the file, and asking a browser for its own copy of the tree gives the same thing. The tree
is called the DOM, the document object model, and it is the thing every later stage works with: the renderer draws it, a script
edits it, a screen reader walks it.

Two consequences follow, and most of this course is about them:

- **The markup is an instruction for building a tree**, not a format that has to be preserved. What matters is the tree the
  browser builds from it.
- **The tree is normalised.** The parser decides where a `<tbody>` goes, closes elements that were left open and moves content out
  of places it is not allowed. What you wrote and what the browser built can differ.

## HTML is not a programming language

There is no loop, no variable, no function and no condition. A page is a description of content, and the program that acts on it
is the browser. Anything that has to react to a click, fetch data or compute a value belongs to JavaScript, and JavaScript in this
course appears only as a measuring instrument.

The three languages of a page, and where each one lives:

| Language | Job | Course |
| --- | --- | --- |
| HTML | structure and meaning | this one |
| CSS | presentation | the CSS course |
| JavaScript | behaviour and the DOM | the JavaScript and TypeScript courses |

Keeping them apart is a habit rather than a rule the browser enforces, and the browser will happily let you do the wrong thing.
A `style` attribute in the markup is CSS in an HTML file, and a `click` handler is JavaScript in an HTML attribute. Both work, and
both make a page that cannot be restyled or tested without editing every file.

## The standard is a living document

HTML is specified by the WHATWG, whose version is updated continuously rather than released in editions, and by the W3C, which
publishes snapshots of it. The two are the same text in practice, and the difference that matters to a reader is that the living
standard is the current one.

Where a rule is not obvious, the standard says what the parser does rather than what a page should contain, and the two are
different documents: one describes how to build a tree from anything, and the other describes which documents are conforming.
That split is why HTML has no errors at all.

## There are no errors

```html
<p>One
<p>Two
```

A person might expect a complaint about the element left open. The parser produces two paragraphs and carries on, because the
HTML standard specifies what to do with every input, including broken input. So a browser will always give you a page, and a page
with a mistake in it looks fine until the mistake changes the tree in a way you did not intend.

The next page is the parser: what it does with the markup, and the handful of rules that explain the surprising trees.

## Check yourself

Save the file above, open it in a browser and view the page source, then use the browser's inspector to look at the tree. Compare
the two and find one thing the parser added that you did not write. Then write a file with a `<div>` instead of an `<h1>` and say
what a search engine would lose.
