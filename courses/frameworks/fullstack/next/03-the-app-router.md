---
title: The App Router
summary: Folders into URLs, a file name for each role, and where the files that are not routes go.
chapter: Getting started
minutes: 14
status: draft
---

## A folder is a segment

```text
app/layout.tsx                      wraps everything
app/page.tsx                        /
app/about/page.tsx                  /about
app/books/page.tsx                  /books
app/books/[id]/page.tsx             /books/dune
app/books/[id]/loading.tsx          the fallback for /books/dune
app/api/books/route.ts              /api/books
app/api/books/[id]/route.ts         /api/books/dune
app/not-found.tsx                   the 404 page
app/error.tsx                       the error boundary
app/sitemap.ts                      /sitemap.xml
app/robots.ts                       /robots.txt
```

That is this course's application, and it is the whole routing configuration. A URL becomes reachable when a folder
contains a `page` or a `route` file, and nothing else in the folder affects the URL.

## The file names

| File | Role |
| --- | --- |
| `layout.tsx` | UI shared by a segment and everything under it |
| `page.tsx` | the UI for a URL, and the leaf of the segment |
| `loading.tsx` | what to show while the segment's page is loading |
| `error.tsx` | the error boundary for the segment |
| `global-error.tsx` | the boundary above the root layout |
| `not-found.tsx` | what `notFound()` renders |
| `route.ts` | an HTTP endpoint rather than a page |
| `template.tsx` | like a layout, but re-mounted on every navigation |
| `default.tsx` | the fallback for a parallel route slot |

Each one is optional except that a route needs a `page` or a `route`, and the role comes from the file name rather than
from anything you register.

There is a hierarchy to remember, because it decides what wraps what:

```text
layout
  template
    error
      loading
        not-found
          page
```

So `app/books/loading.tsx` shows while anything inside `/books` is loading, and `app/books/[id]/loading.tsx` narrows
that to a single book. The next pages take each of them in turn.

## Colocation

A folder in `app/` may hold anything else you like, because only the file names above are routes:

```text
app/api/books/route.ts          a route
app/api/books/route.test.ts     a test for it, not a route
app/actions.ts                  server functions, not a route
app/actions.test.ts             a test for those, not a route
components/LoanForm.tsx         a component, outside app/ entirely
lib/books.ts                    data and helpers
```

That last group is a choice rather than a rule. This application keeps components and data outside `app/` so that `app/`
reads as a map of the URLs, which is the strategy the docs call "store project files outside of `app`". The alternatives
are folders inside `app/` and a folder per feature, and all three are supported.

A folder whose name starts with an underscore is a private folder, and it is never a route:

```text
app/books/_components/BookRow.tsx
```

That is how a component used by one route sits next to the route that uses it without becoming a URL.

## Route groups and dynamic segments

```text
app/(marketing)/about/page.tsx      /about
app/(shop)/cart/page.tsx            /cart
app/blog/[slug]/page.tsx            /blog/one-post
app/shop/[...slug]/page.tsx         /shop/a  and  /shop/a/b
app/docs/[[...slug]]/page.tsx       /docs  and  /docs/a
```

A folder in parentheses is a route group: it holds files together, and the name is left out of the URL. It is how two
sections get different layouts, and how a `loading.tsx` is scoped to some routes rather than all of them. Removing the
top-level `layout.tsx` and putting one inside each group gives an application several root layouts, each with its own
`<html>` and `<body>`.

Square brackets are a dynamic segment: `[slug]` is one value, `[...slug]` is one or more joined into an array, and
`[[...slug]]` is the same with an empty case. The values arrive as `params`, and the next page takes them apart.

## Check yourself

Add an about page and a route group so that `/about` and `/books` share one layout that the home page does not use. Run
`next build` and read the route table to confirm the group's name does not appear in any URL, then check that
`app/about/page.tsx` is still the file that renders it.
