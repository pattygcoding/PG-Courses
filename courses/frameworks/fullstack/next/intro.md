---
title: Next.js
level: Intermediate
summary: Build the library with the App Router, stream what is slow, cache what is not, and ship the server that serves it.
labels:
  - Framework
  - Fullstack
  - React
minutes: 26
status: draft
---

## What this course is

Next.js is a React framework with a server in it. React renders a component tree; Next.js decides where that rendering
happens, what the browser receives when, and how a write finds its way back.

Three things make it a framework rather than a library:

- **The file system is the router.** A folder is a URL segment and a file name is a role: `page.tsx` is the page,
  `layout.tsx` is the frame around it, `route.ts` is a JSON endpoint, `loading.tsx` is what shows while the page waits.
- **Components run on the server by default.** A page can read a database, call an API with a secret in it, or check a
  cookie, and none of that code is sent to the browser. `'use client'` marks the components that do need to run there.
- **The framework decides what is static.** With Cache Components, which is on in a new application, data is fetched per
  request unless you say `'use cache'`. Next.js then prerenders a shell, streams the rest, and gives you one tag to
  invalidate when a write changes what a page shows.

That third point is the biggest change in the current version and the reason this course starts where it does. Older
Next.js courses teach the opposite default, where `fetch` was cached unless you opted out. The pages here are written
against 16.4.3 and every command output in them came from a real run.

## Who it is for

You can write React, and you want an application with URLs, a server, a database behind it and a deploy that works, or
you have a Next.js application to maintain and want to know what the framework is doing with each request.

The React course in this catalogue covers the language of components: state, effects, context, hooks, and what a
re-render costs. This course assumes all of that and spends its time on the framework: routing, server and client
components, caching, mutations, route handlers, the proxy, tests and shipping. Where a React feature matters here, it is
named and used rather than explained.

## What you will build

A library application, the same Northside Library the Ruby and Rails courses build, with a public catalogue, a desk for
the librarian and a waiting list.

By the end it has: a catalogue that filters through its URL, a book page per title with metadata built from the book, a
cached catalogue that a loan invalidates, a waiting list with an optimistic entry, a desk that lives in a cookie, route
handlers serving the same data as JSON, a proxy that redirects an old URL, a sitemap and robots file, error and not-found
boundaries, 34 unit tests, 6 end-to-end tests, and a standalone build that runs in a container.

Everything in the pages that follow came out of building it, including four build failures and a dependency conflict,
which are in the places where a failure teaches more than a clean run would.

## Prerequisites

Node.js 20.9 or later, which Next.js 16 requires, and TypeScript 5.1 or later. This course was written on Node 24.22 and
TypeScript 5.9, with Next.js 16.4.3 and React 19.3.0.

You need a terminal, and you should be comfortable with `npm`, with `async`/`await`, and with the JSX and hooks from the
React course.

## How the pages are ordered

The first chapter is what the framework is and what `create-next-app` writes, including the two files that decide what
is static. The second is routing: folders into URLs, params, search params, layouts and the boundaries around a page.

The third is data: fetching in a server component, streaming a slow part behind a boundary, Cache Components, cache
lifetimes and tags, and route handlers for the callers that want JSON. The fourth is mutations: server functions, forms,
revalidation, optimistic updates and cookies.

The fifth is everything around the pages: metadata, images and fonts, styling, configuration, and the proxy that runs
before a request reaches any of it. The sixth is quality: types, unit tests, server tests, end-to-end tests, linting and
the measurements that matter.

The last chapter is shipping: the production build, the standalone output, the container, where to deploy it, and the
Pages Router, which is what came before and is still in a lot of applications.

Read them in order the first time, following the contents list on this page. Each lesson ends with something to run or
work out, and the later lessons assume the application from the earlier ones exists.
