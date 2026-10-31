---
title: What the server sends
summary: HTML for the first paint, a payload for React, and the water that both have to hydrate.
chapter: Getting started
minutes: 13
status: draft
---

## Two things in one response

A request for a page in this application returns a document that contains both:

- the **HTML**, which is what the browser paints before it runs any JavaScript;
- the **RSC payload**, which is the component tree as data, and what React replays to attach the behaviour.

The payload is at the bottom of the body, inside the script chunks, pushed onto an array the client runtime reads:

```html
<script>self.__next_f.push([1,"...the component tree as data..."])</script>
```

On a page with a cached section that payload is the same data that a client-side navigation reuses. Searching the
catalogue page's response for the count finds it as data rather than as markup:

```text
{"className":"count","children":[4," of ",4," titles"]}
```

That is the component tree: an element, its class, and its children as an array. The visible text in the HTML is the
same content rendered to strings, with a comment between the text nodes React kept apart:

```text
4<!-- --> of <!-- -->4<!-- --> titles
```

That comment is not decoration. It is how React marks the boundary between two children so that hydration can reuse the
existing DOM nodes instead of rebuilding them. It is also why a test that looks for the exact string `4 of 4 titles`
fails: the text is several nodes, not one. React Testing Library reports exactly that:

```text
TestingLibraryElementError: Unable to find an element with the text: 0 waiting.
This could be because the text is broken up by multiple elements.
```

The fix in a test is a matcher that normalises, or an assertion on the parts. In the browser nothing is wrong.

## The payload is not the component code

The payload carries the *result* of running the server components, not the components themselves. A server component
that reads a database does not put its query, its credentials, or its dependencies in the response; only what it
returned. That is the whole security and size argument for the model, and it is worth checking on your own application:

```bash
curl -s http://localhost:3000/books | grep -c "SELECT"
```

Zero matches is the answer you want. The data layer of this application imports `server-only`, so it could not appear in
the payload even by mistake.

## Streaming is one response, several chunks

A page whose slow parts sit behind a `Suspense` boundary arrives as a shell followed by chunks. The browser paints the
shell, then React fills the boundary when the chunk lands. The header, the navigation and the search form are in the
first chunk; the list that waits on `searchParams` arrives after it, and `books/loading.tsx` is what shows in between.

Two consequences worth knowing:

- The status line is sent with the shell. A `notFound()` that runs after streaming has started cannot change it, which
  is why an unknown book in this application answers 200 with the not-found page in the body.
- A crawler that needs the metadata in the `<head>` is a special case. Next.js detects the user agents that cannot handle
  a streamed head and renders those requests dynamically instead.

## Hydration

Hydration is React taking over the HTML: it walks the tree, matches each element against the payload, attaches event
handlers and runs effects. Two things about it decide how a page feels:

| Cost | What makes it smaller |
| --- | --- |
| the client bundle | fewer `'use client'` files, and smaller ones |
| the payload | fewer props crossing the boundary, and less data in them |

A page that ships a megabyte of JavaScript pays for it after the first paint, not before, which is why a heavy interactive
widget is worth isolating in a client component of its own instead of marking the page around it.

## What the development overlay is telling you

In development, Next.js shows a badge in the corner with a count. Clicking it opens the dev tools, and the entries there
are the framework telling you about a decision rather than a bug:

```text
Route "/books/[id]": Next.js encountered URL data during prerendering or a navigation.

`params` or `searchParams` accessed outside of `<Suspense>` may prevent the navigation from being instant,
leading to a slower user experience.

Ways to fix this:
  - [stream] Provide a placeholder with `<Suspense fallback={...}>` around the data access
  - [block] Set `export const instant = false` to allow a blocking route
```

The fix is the one this application uses: read the params inside a boundary so the shell can be prerendered. The message
names the file, the reason and both options, which is more than most linters manage.

## Check yourself

Fetch a page of your application with `curl` and save the response. Find the RSC payload at the bottom, then find the
same content in the HTML above it. Then open the page with JavaScript disabled and check which parts still render, and
which parts are there but do nothing.
