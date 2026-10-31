---
title: Route groups and colocation
summary: Parentheses keep a folder out of the URL, and an underscore keeps it out of the router.
chapter: Routing
minutes: 12
status: draft
---

## A folder that is not a segment

```text
app/(shop)/books/page.tsx          /books
app/(shop)/cart/page.tsx           /cart
app/(marketing)/about/page.tsx     /about
```

The parentheses mean "group these files, and leave the name out of the URL". Nothing about `/books` or `/about` changes;
what changes is which layout wraps them.

That is the reason to use one. Two sections of an application that share a marketing frame get a group each, and each
group gets a `layout.tsx`:

```text
app/(shop)/layout.tsx        a bar of genres, on the catalogue and the cart
app/(shop)/books/page.tsx
app/(shop)/cart/page.tsx
app/(marketing)/layout.tsx   a footer with contact details
app/(marketing)/about/page.tsx
```

A group also scopes a `loading.tsx` or an `error.tsx` to a set of routes without touching their URLs, which is the smaller
use and the one that comes up more often.

## Several root layouts

A group is the only way to have more than one root layout: remove `app/layout.tsx`, add `app/(shop)/layout.tsx` and
`app/(marketing)/layout.tsx`, and each becomes a root for its own routes. Each one needs its own `<html>` and `<body>`, so
this is a choice for sections that are really separate applications sharing a domain.

It costs a full document reload when you navigate between them, because React has to mount a different root. For a
marketing site beside an admin console that is fine. Between two pages of the same listing it is not.

## Underscore means private

```text
app/books/_components/BookRow.tsx     never a route
app/books/page.tsx                    /books
```

A folder whose name starts with an underscore is excluded from routing entirely. It is the way to keep a helper or a
component next to the route that uses it:

```tsx
import { BookRow } from "./_components/BookRow";
```

A file inside `app/` that is not one of the reserved names is not a route either, so this is about intent rather than
mechanism: `_components` says "not a URL" to whoever reads the tree next.

## Where the files that are not routes live

This application keeps them outside `app/`, which is one of the three strategies the docs describe:

```text
app/           routes only, so the tree reads as the URL map
components/    the three client components, and the server components beside them
lib/           data, helpers, and the server-only data layer
test/stubs/    a stub the test runner needs
```

The other two are folders inside `app/` and a folder per feature. All three work; the one to avoid is no strategy at all,
where the answer to "where does this go" changes file by file.

## Colocation is why tests sit next to routes

The unit tests in this application live beside what they test, including inside the router folder:

```text
app/actions.ts                  server functions
app/actions.test.ts             their tests
app/api/books/route.ts          the JSON endpoint
app/api/books/route.test.ts     its tests
components/WaitingList.tsx      the waiting list
components/WaitingList.test.tsx its tests
```

`next build` ignores the test files, so a route folder can hold them, and a reader who opens `route.ts` finds its test in
the same directory. The alternative is a `__tests__` tree that mirrors `app/`, which is the convention the docs use in
their example and costs a second tree to keep in sync.

## Check yourself

Put the catalogue, the book page and the desk into one route group with a shared layout, and the home page outside it.
Then run `next build` and confirm the URLs in the route table are unchanged, and that the two layouts are both in the
output.
