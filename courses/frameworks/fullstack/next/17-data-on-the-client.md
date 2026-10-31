---
title: Data on the client
summary: When the browser should fetch, and how a client component reads a promise the server handed it.
chapter: Data and caching
minutes: 12
status: draft
---

## Server first

The default in this application is that a page renders with its data already in it. The browser receives HTML, not an empty
shell plus a request of its own. Before reaching for a client-side fetch, check whether the data is needed on the first
paint, because if it is, the server render was free:

| The data is | Fetch it |
| --- | --- |
| needed for the first paint | on the server, in the page |
| needed after a filter the visitor sets | on the server, through the URL |
| needed after a click, in place | from a route handler, in the client |
| changing every second | from the client, or a stream |
| behind a permission the page cannot check | from a route handler that checks it |

The second row is the one people get wrong first. A filter that changes the URL keeps the data on the server, keeps the
result shareable, and lets the back button work.

## A promise passed to the client

A server component can hand a promise to a client component and let React resolve it:

```tsx
import { Suspense } from "react";

export default function Page({ searchParams }: PageProps<"/reports">) {
  return (
    <Suspense fallback={<p>Loading the report...</p>}>
      <Report searchParams={searchParams} />
    </Suspense>
  );
}
```

```tsx
"use client";

import { use } from "react";

export function Report({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = use(searchParams);

  return <p>{params.genre ?? "every genre"}</p>;
}
```

`use` is not a hook with rules about where it may be called; it is how a client component reads a promise. The promise has
to arrive as a prop, and React's `Suspense` above it is what shows while it settles.

This is worth knowing and worth using sparsely. The promise is resolved on the server, so the cost is one extra render pass,
and a component that only needs a value is simpler when the value is passed.

## Fetching in an effect

For data that genuinely only exists in the browser, the ordinary React pattern still applies:

```tsx
"use client";

import { useEffect, useState } from "react";

export function Availability({ bookId }: { bookId: string }) {
  const [available, setAvailable] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/books/${bookId}`)
      .then((response) => response.json())
      .then((book) => {
        if (!cancelled) {
          setAvailable(book.available);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  return <p>{available === null ? "Checking..." : `${available} on the shelf`}</p>;
}
```

Everything in that component is React rather than Next.js, and the React course covers it: the effect runs after the first
paint, the cleanup flag stops a late response from setting state on a gone component, and the dependency array decides when
it refetches.

What Next.js adds is the endpoint. `/api/books/[id]` is a route handler in the same project, so the fetch is same-origin,
needs no CORS configuration, and shares the data layer with the page.

## The library question

A dependency array is easy to get wrong in the ways effect-based fetching always is: no caching between components, no
retry, no deduplication, and a refetch on every mount. Libraries such as SWR and TanStack Query exist for exactly that, and
the framework's docs list them under the third-party options rather than shipping one.

The decision is simple and honest:

- if one component needs the data once, the effect above is enough;
- if several components share it, if it needs revalidation, or if the visitor should see stale data while fresh data
  loads, a client data library earns its dependency.

Neither is a substitute for the server render. A page that renders its main content from the client always paints later
than one that does not.

## Asking the server again

A client component does not need to refetch anything after a server function runs: the action's response carries the
updated UI. For the cases where nothing in React knows about the change, such as a websocket message, the escape hatch is
`router.refresh()`:

```tsx
"use client";

import { useRouter } from "next/navigation";

const router = useRouter();

<button type="button" onClick={() => router.refresh()}>
  Refresh
</button>
```

It re-renders the current route on the server and leaves client state alone. It is a bigger hammer than invalidating a tag,
because it re-renders the route rather than one entry, and it is the right one when the change came from outside the
application.

## Check yourself

Take the availability component above and move it to the server: render the count in the book page and delete the route
handler's use for it. Then write down the two things the visitor gains and the one thing the application loses.
