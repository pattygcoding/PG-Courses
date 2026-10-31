---
title: Loading, error and not-found
summary: Three boundaries beside a page, each with one job, and how to see each of them in this application.
chapter: Routing
minutes: 14
status: draft
---

## loading.tsx

```tsx
export default function CatalogueLoading() {
  return (
    <>
      <h1>Catalogue</h1>
      <p className="lede">Search by title or author, or filter by genre.</p>

      <div className="filters" aria-busy="true">
        <div className="skeleton" style={{ width: "14rem", height: "2rem" }} />
        <div className="skeleton" style={{ width: "9rem", height: "2rem" }} />
      </div>
    </>
  );
}
```

The file name is the whole configuration. Navigating to `/books` shows this while the page's data is on its way, and the
layout around it stays on screen because `loading.tsx` sits inside `layout.tsx` and not above it.

A `loading.tsx` is a `Suspense` boundary the framework puts around the page for you, so it and a hand-written boundary do
the same work. Reach for the file when the whole route waits, and for a boundary when part of the page should paint first.
The catalogue uses both: the file for the route, and a boundary for each of the two parts inside it.

One detail worth copying: the skeleton keeps the heading text that the real page renders. A fallback that says "Loading"
makes the page shift when the content arrives; a fallback shaped like the content does not.

## error.tsx

```tsx
"use client";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <h1>Something went wrong</h1>
      <p className="lede">The page could not be rendered. The header and the footer are still here.</p>

      <div className="errors">
        <p>{error.message}</p>
        {error.digest ? <p className="muted">digest: {error.digest}</p> : null}
      </div>

      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </>
  );
}
```

Four things are true of every error boundary in Next.js:

- It is a client component, because React error boundaries are.
- It receives `error` and `reset` from React, so there is no generated helper type for it. The types above are written by
  hand, and `digest` is optional because it only appears for errors that came from the server.
- It replaces the segment's content, not the layout, so the header and footer survive.
- `reset()` re-renders the segment. If the error was transient, the page comes back.

In production the message from a server error is replaced with a generic string, and the digest is what ties the page a
visitor saw to the stack trace in the logs:

```text
digest: 2142898062
```

That is why the end-to-end test for this page asserts the digest rather than the message. Printing `error.message` to a
visitor is fine for the boundaries you control and wrong for one that wraps code that might leak a query or a path.

## Seeing it work

The desk page has a deliberate switch so the boundary can be exercised:

```tsx
if (first(params.fail) === "1") {
  throw new Error("The desk is unavailable: this is the switch for the error page.");
}
```

Open `/loans?fail=1` and the boundary renders. Two behaviours are worth checking while you are there: the error is
reported once for the render, and clicking Try again re-renders the segment rather than reloading the page.

## global-error.tsx

An error in the root layout itself has no layout left to fall back on, so the last boundary renders its own document:

```tsx
"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <h1>The application failed to start</h1>
        <p>{error.message}</p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  );
}
```

It should exist in every application and it should almost never appear. If it does, something in the root layout threw,
and the page it renders has no stylesheet because the layout was what imported it.

## not-found.tsx

```tsx
export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p className="lede">That page is not in the catalogue, and neither is the book behind it.</p>
      <p>
        <Link href="/books">Browse the catalogue</Link>
      </p>
    </>
  );
}
```

Two paths lead here: a URL that matches no route at all, and `notFound()` called from a page:

```tsx
const book = await getCatalogueEntry(id);

if (!book) {
  notFound();
}
```

`notFound()` throws, so nothing after it runs, and TypeScript narrows `book` for the rest of the function. The nearest
`not-found.tsx` is what renders, which is why a book page inside `/books` can show a different message from the one at the
root.

## Choosing between them

| Situation | What to use |
| --- | --- |
| the route is waiting for data | `loading.tsx` |
| part of a page is waiting | `<Suspense>` around that part |
| a render failed | `error.tsx` |
| the root layout failed | `global-error.tsx` |
| a record does not exist | `notFound()` |
| the URL is wrong | the root `not-found.tsx` |

The last two are worth keeping apart. A wrong URL is a mistake; a missing record is a fact about your data, and it deserves
a page that says so.

## Check yourself

Add a boundary and a `loading.tsx` to the desk route, then make the desk's data function take three seconds and watch the
page in the browser with the network throttled. Note which parts painted before the data, and add the boundary in the
place that removes the worst of the wait.
