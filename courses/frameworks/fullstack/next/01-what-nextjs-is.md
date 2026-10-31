---
title: What Next.js is
summary: React plus a server, a router made of folders, and a framework that decides what is static.
chapter: Getting started
minutes: 13
status: draft
---

## The React part and the server part

React renders a tree of components to HTML, in the browser or on the server. Next.js wraps that with everything a
React application otherwise has to choose for itself:

| Need | What Next.js brings |
| --- | --- |
| routing | folders under `app/` become URLs |
| rendering | server components, client components, and the boundary between them |
| data | fetching on the server, caching, revalidation |
| a build | Turbopack, which compiles and bundles both sides |
| assets | `next/image`, `next/font`, and a hashed asset pipeline |
| a server | `next start`, or a standalone Node server |
| an API | `route.ts` files that speak Request and Response |

A new application installs three packages:

```json
"dependencies": {
  "next": "16.4.3",
  "react": "19.3.0",
  "react-dom": "19.3.0"
}
```

`next` depends on React rather than bundling it, so the version in that file is the one both halves of the application
render with.

## Folders are URLs

```text
app/page.tsx                      /
app/books/page.tsx                /books
app/books/[id]/page.tsx           /books/dune
app/books/[id]/loading.tsx        what shows while /books/dune waits
app/api/books/route.ts            /api/books, as JSON
proxy.ts                          runs before any of them
```

There is no route table to keep in sync with the pages. The folder tree in this course's application and the route table
`next build` prints are the same list read two ways:

```text
Route (app)                           Revalidate  Expire
┌ ◐ /                                         1m      1h
├ ○ /_not-found
├ ○ /about
├ ƒ /api/books
├ ƒ /api/books/[id]
├ ◐ /books
├   /books/[id]
│ ├ ◐ /books/[id]
│ ├ ◐ /books/dune                             1h      1d
│ └ ◐ [+2 more paths]
├ ◐ /loans
├ ○ /robots.txt
└ ƒ /sitemap.xml

ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand
```

Read that table as the answer to "what does the server do for this URL". A circle is a page built once. A half circle is
a page whose shell is built once and whose slow parts stream. The ƒ marker is a page rendered on every request.

## What the server does with a request

```text
request
  proxy.ts                  redirects, rewrites, headers, before routing
  cache lookup              a prerendered shell, if there is one
  server components         a page and its children, on the server
  client components         rendered to HTML too, then hydrated in the browser
  stream                    anything behind a Suspense boundary, when ready
```

Two of those lines are worth remembering before the rest of the course: everything runs on the server first, and the
client bundle contains only the components marked `'use client'` and the props they were handed.

## What changed in 16

If you have read about Next.js before, some of it will be out of date. The five changes that matter most:

| Change | Detail |
| --- | --- |
| Turbopack is the default | `next dev` and `next build` use it, and its config lives in `next.config.ts` |
| `middleware.ts` is `proxy.ts` | the file and the function were renamed, and it runs on Node.js by default |
| `params` and `searchParams` are promises | `await` them in a server component, or `use()` them in a client one |
| Cache Components is the default for new apps | data is fetched per request unless you write `'use cache'` |
| `next lint` is gone | linting is `eslint`, with a flat config the scaffold writes |

The framework's own error messages are the other reason to be on the current version. Two of them appear in this course
as lessons: one tells you a route could not be prerendered, and it names all three ways to fix it.

## Check yourself

Create an application and run `npm run build`, then read the route table and write down which routes are static, which
stream, and which are rendered on demand. Then open `next.config.ts` and say what each option in it does.
