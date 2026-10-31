---
title: The head and its metadata
summary: What goes above the content, what each part is for, and the order that matters.
chapter: Getting started
minutes: 13
status: draft
---

## Everything above the content

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="The catalogue of the Northside Library, with every book on loan.">
    <meta name="robots" content="index, follow">
    <title>Books - Northside Library</title>
    <link rel="canonical" href="https://library.example.com/books">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <h1>Books</h1>
  </body>
</html>
```

The head is information *about* the document. None of it is drawn, and all of it is read by something: the browser, a search
engine, a chat application making a preview, a screen reader. Parsing that file gives a tree with every one of those elements in
place, in the order written:

```text
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="The catalogue of the Northside Library, with every book on loan.">
    <meta name="robots" content="index, follow">
    <title>
      #text "Books - Northside Library"
    <link rel="canonical" href="https://library.example.com/books">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    <link rel="stylesheet" href="/styles.css">
```

## The four elements

Everything in a head is one of four things, and each has one job:

| Element | Job |
| --- | --- |
| `meta` | a name and a value about the document |
| `title` | the document's name |
| `link` | a relationship to another resource |
| `style` | CSS written into the document, which belongs in the CSS course |

`script` also lives in the head, and it belongs to the JavaScript course. Those five are the whole vocabulary: everything that
looks like metadata is a `meta` element with a different `name`.

## The two required pieces of metadata

```html
<meta charset="utf-8">
<title>Books - Northside Library</title>
```

These two are not optional. A document without a title has an empty name, so the tab shows the URL, a bookmark shows the URL and a
search result shows whatever heading it can find instead. Verified, on a page with no `title` element at all:

```text
document.title: ""
title elements in the tree: 0
```

The character encoding has to be declared, and the parser reads the declaration from the first part of the file. The standard says
the `meta charset` element must be **serialised entirely within the first 1024 bytes** of the document, which is why it goes
immediately after `<head>` and why a long comment or license header above it is a real way to break a page.

I could not demonstrate the failure on this machine, and the reason is instructive: a browser whose default encoding is already
UTF-8 decodes the file correctly however late the declaration arrives. A server sending a different default does not, and the
symptom is `Ã©` where `é` should be. The rule is worth following because the environment that breaks is the one you deploy to.

## The viewport meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

A phone needs to know whether to render the page at the width of the screen or to pretend it is a wide desktop and let the reader
zoom. Without this line, a page is laid out at around 980 pixels wide and shrunk to fit, so the text is unreadably small until
the reader pinches. With it, the layout width is the device width and the media queries in the CSS course have something sensible
to work with.

`initial-scale=1` sets the initial zoom, and those two together are the minimum. `maximum-scale` and `user-scalable=no` appear in
advice online and both of them stop a reader zooming in, which is an accessibility problem rather than a setting.

## The description and the preview

```html
<meta name="description" content="The catalogue of the Northside Library, with every book on loan.">
```

A search engine may use the description as the text under a result's title. It is not a ranking factor, it is a sentence written
for a person deciding whether to click, and a page with no description gets a sentence cut out of its content instead, which is
usually one that starts mid-thought.

For the previews in a chat application or a social site the metadata is a different set, and it is not `name` at all:

```html
<meta property="og:title" content="Books">
<meta property="og:description" content="Every book in the catalogue.">
<meta property="og:image" content="https://library.example.com/cover.jpg">
```

That is Open Graph, which came from Facebook and is read by most link-preview generators. The attribute is `property` rather than
`name`, because the schema behind it is RDFa's and that is the attribute that schema uses. The last chapter of this course covers
the rest of it.

## The rel values

```html
<link rel="canonical" href="https://library.example.com/books">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="stylesheet" href="/styles.css">
```

The `rel` attribute says what the relationship is, and its value is a list of words separated by spaces. That is why a selector for
the icon is `link[rel~=icon]` rather than `link[rel=icon]`.

- **`canonical`** names the page's preferred URL, which is how a site with `?sort=price` and `?sort=title` showing the same
  content tells a search engine that one of the two is the page.
- **`icon`** is the tab icon, and `sizes` says which size a file provides when several are offered.
- **`stylesheet`** is CSS, and the CSS course takes it from there.

The other `rel` values worth knowing are `alternate` for a translation or a feed, `preload` and `prefetch` for hinting at a
resource the page will need, and `noopener` and `noreferrer` for links, which is a later lesson.

## The order

The order in the head matters in three places, and nowhere else:

1. **`meta charset` first**, for the 1024-byte rule.
2. **The viewport meta before the stylesheet**, so the layout width is settled before CSS is applied.
3. **The stylesheet before any script that inspects the layout**, because a script in the head blocks rendering until it has run,
   which is the JavaScript course's subject.

Everything else is a convention, and I keep the order in the example at the top of this page because a head in a consistent order
is a head that can be scanned.

## Check yourself

Add a description, a viewport meta and an icon link to a page you have, then inspect the head in the browser and confirm each is a
separate element. Remove the `title` and check what the tab shows. Finish by writing an Open Graph title and image for the page
and finding both as `property` rather than `name`.
