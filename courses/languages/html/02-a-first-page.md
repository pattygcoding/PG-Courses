---
title: A first page
summary: The five parts every document has, the vocabulary for talking about them, and what the browser makes of it.
chapter: Getting started
minutes: 13
status: draft
---

## The smallest complete document

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>A first page</title>
  </head>
  <body>
    <h1>Library</h1>
    <p>Books, members and loans.</p>
  </body>
</html>
```

Five kinds of line, each doing one job:

| Line | What it is |
| --- | --- |
| `<!doctype html>` | the doctype, saying this is modern HTML |
| `<html lang="en">` | the root element, with the document's language |
| `<head>` | information about the document |
| `<title>` | the page's name |
| `<body>` | the content a reader sees |

The doctype is the one that looks like a tag and is not. It is a declaration, it has no closing tag, and its only job in modern
HTML is to make the browser use standards mode rather than the quirks mode of the 1990s. Leave it out and the browser behaves
differently, which the next page shows.

## The vocabulary

Four words are worth having exactly right, because the standard uses them and so does every error message you will read:

- An **element** is a tag pair and everything between, so `<p>Hello</p>` is an element.
- A **tag** is the markup itself, `<p>` or `</p>`.
- An **attribute** is a name and a value inside a start tag, so `lang="en"` in `<html lang="en">`.
- **Content** is what is between the tags, which can be text or other elements.

`<html lang="en">` is therefore the `html` element with a `lang` attribute whose value is `en`. `<p>Hello</p>` is a `p` element
whose content is the text `Hello`, and the text is a node of its own. Inside the tree, an element is a node with children, and a
run of text is a node with none.

## head and body

Everything in a document is in the `head` or the `body`, and the split is about the reader rather than the machine:

- The **head** holds information about the document: its title, its encoding, its description, links to the stylesheet and the
  icon. Nothing in it is drawn in the page.
- The **body** holds the content: the headings, paragraphs, images and forms a reader sees.

The split is worth knowing because the parser enforces it rather than complaining. The head ends at the first element that is not
allowed in it, and everything from that point becomes body content:

```text
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>
      #text "In the head"
  <body>
    <p>
      #text "A paragraph in the head"
    <h1>
      #text "A heading in the head"
```

A paragraph written into the head is not dropped: it ends up in the body, in front of the content that was already there, and the
head closes early. The same is true in the other direction, where nothing is moved back:

```text
    <title>
      #text "A title in the body"
    <meta name="description" content="A meta in the body">
```

Those two elements stayed in the body. The tree now has two `title` elements and two `meta` elements, and the browser reads the
first of each:

```text
document.title: "In the head"
title elements in the tree: 2
```

The document's title is the one in the head, and the second `title` element in the body is inert. That is the shape of every
mistake in this area: the parser makes a decision, the tree is valid, and the effect shows up somewhere you are not looking.

## The title is not optional

```html
<title>Library</title>
```

The title appears in the browser tab, in a bookmark, in the history list and as the heading of a search result. Every one of
those is a place a reader meets the page before it is open, and a page whose title is the same as every other page on the site is
a page a reader cannot find in their own tabs.

A title is a short phrase describing the page, not the site and not a slogan: `Books on loan - Northside Library`, with the page
first and the site second, which is the order that survives being truncated in a tab.

## The language and the encoding

```html
<html lang="en">
  <head>
    <meta charset="utf-8">
```

`lang="en"` tells the browser and every assistive technology which language the content is in. A screen reader uses it to pick a
pronunciation, a translation tool uses it to decide whether to offer, and a search engine uses it as one signal about the page's
audience. It is one attribute and it changes how the page is read aloud.

`<meta charset="utf-8">` says how the bytes of the file turn into characters. Without it the browser guesses, and a guess is right
until the first non-ASCII character appears in a title or a name, at which point it becomes `Ã©` on the page. Both of these get
their own chapter later; they are in the first page because getting them wrong is silent.

## The first two lines of the file

```html
<!doctype html>
<html lang="en">
```

The `<meta charset>` has to appear within the first 1024 bytes of the file for the browser to find it before it starts decoding,
which is why the order above puts it immediately after the `<head>`. A comment or a long license header before it is a real way to
break the encoding of a page.

## What the browser makes of it

```text
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>
      #text "A first page"
  <body>
    <h1>
      #text "Library"
    <p>
      #text "Books, members and loans."
```

Two things to notice. The `<!doctype html>` is not in the tree, because it is not an element and the parser handles it before the
tree exists. And every element has the children you wrote with no additions, which is what a conforming document produces.

## Check yourself

Write the file from the top of this page, open it and check the tab shows the title. Then remove the `<!doctype html>` line and
look at the page again, and add a paragraph inside the `head` and inspect the tree to see where the parser put it.
