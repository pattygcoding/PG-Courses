---
title: Linking and navigation
summary: next/link for navigation, what a prefetch actually fetches, and how to read the current URL.
chapter: Routing
minutes: 13
status: draft
---

## Link rather than an anchor

```tsx
import Link from "next/link";

<Link className="book-title" href={`/books/${book.id}`}>
  {book.title}
</Link>
```

`next/link` renders an `<a href>` with a click handler. The href means the link works without JavaScript, is right-clickable,
and is followed by a crawler. The handler is what makes the navigation soft: React fetches the route's payload, renders it
in place, and keeps the document, the scroll position and the mounted layouts.

An `<a href>` reaches the same page with a full page load, which loses client state and re-runs everything. There are
places for a plain anchor, such as a link to another domain or a file download, and a navigation inside the application is
not one of them.

## What a prefetch fetches

A link in the viewport is prefetched, and the framework decides how much. The configuration for it is in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};
```

With Partial Prefetching, the prefetch brings back the route's static shell rather than the whole page. Clicking then
paints the shell immediately and fills the dynamic parts. The docs describe this as the point of the option: the
navigation is instant because the part that can be known ahead of time already is.

A viewport that fills with links, such as a long catalogue, is where this matters. The pages that cannot be prefetched at
all are worth knowing too, because a heavy page behind a link is a slow click whatever the shell does:

| Route | Prefetch behaviour |
| --- | --- |
| static or partially prerendered | the shell is prefetched |
| rendered on demand with nothing cached | little to prefetch, so the click pays for it |
| behind a `loading.tsx` | the fallback is what a visitor sees first |

## Reading the current URL

A client component that needs to know where it is has three hooks:

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const pathname = usePathname();          // "/books/dune"
const params = useSearchParams();         // ?q=dune
const router = useRouter();               // router.push("/books"), router.replace(...), router.refresh()
```

`usePathname` is what an active link is built from:

```tsx
const pathname = usePathname();
const isCurrent = pathname === href;

<Link href={href} aria-current={isCurrent ? "page" : undefined}>
  {label}
</Link>
```

The `aria-current` attribute is the part that matters: it is what a screen reader announces, and the styling follows from
it rather than from a class that only you can see.

`router.push` is for a navigation a person asked for, and `router.replace` when the history entry should be replaced, such
as after signing in. `router.refresh` re-renders the current route on the server without a full reload, which is the
escape hatch for data that changed outside an action.

## Pending state on a link

The framework also has a hook for the thing every application reinvents: is this navigation still in flight?

```tsx
"use client";

import Link, { useLinkStatus } from "next/link";

function Label({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();

  return <span aria-busy={pending}>{children}</span>;
}

<Link href="/books/dune">
  <Label>Dune</Label>
</Link>
```

Because a prefetched shell paints immediately, the pending window is usually short, and it is exactly the window where a
spinner helps rather than interrupts.

## Back, forward and restored state

With Cache Components on, a route you navigate away from is hidden rather than unmounted, so going back restores its state
without fetching anything: a filled-in search box is still filled in, an expanded panel is still open. That is the
`Activity` behaviour from the layouts page, seen from the navigation side.

Two consequences to test in your own application:

- Effects are cleaned up when a route is hidden and re-run when it is shown, so anything that subscribes is safe.
- A dialog rendered into a portal by a hidden route needs to close itself on hide, because it will not be unmounted.

## Check yourself

Add an active state to the header links with `usePathname` and `aria-current`, then open the network panel and click
between two catalogue pages. Identify the request that brings the shell, the one that brings the dynamic part, and any
request that does not happen at all because it was already prefetched.
