---
title: Cache Components
summary: The flag that makes data dynamic by default, and the directive that opts a function or a component back in.
chapter: Data and caching
minutes: 15
status: draft
---

## The flag

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
};

export default nextConfig;
```

`cacheComponents` does four things at once, which is why it replaced several older flags:

| Effect | Detail |
| --- | --- |
| the directive works | functions, components and whole files can be cached |
| data is dynamic by default | a fetch runs per request unless you cache it |
| Partial Prerendering is on | a route is a static shell plus streamed dynamic parts |
| lifetimes and tags work | `cacheLife` and `cacheTag` apply to the cached results |

It also requires the Node.js runtime, so the `runtime` route segment config has to be removed from every page. An
`export const runtime = "edge"` left over from an earlier version is a build error rather than a silent fallback.

## Dynamic by default, cached on request

This is the inversion the caching page of the docs leads with, and it is worth saying plainly: the expensive thing is now
the default, and caching is what you add.

```ts
/** Runs on every request: nothing here says otherwise. */
export async function getOutstanding(): Promise<OutstandingLoan[]> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return outstandingLoans().map(/* ... */);
}
```

```ts
/** Computed once an hour, and rebuilt only when the tag is invalidated. */
export async function getCatalogue(): Promise<CatalogueEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");

  return catalogue.map((book) => ({
    ...book,
    available: availableCopies(book),
    waiting: waitingFor(book.id).length,
  }));
}
```

Both functions sit in `lib/data.ts` and both are called by pages. One is live and one is cached, and the difference between
them is three lines at the top.

## Three places to put the directive

```ts
// Function level: the return value is cached
export async function getCatalogue() {
  "use cache";
  // ...
}
```

```tsx
// Component level: the rendered output is cached
export async function StatsPanel() {
  "use cache";
  return <ul className="stats">{/* ... */}</ul>;
}
```

```tsx
// File level: every export in the file is cached
"use cache";

export default async function Page() {
  // ...
}
```

Cached functions and components must be `async`, including a file-level page. The compiler enforces it, because a cache
entry is a settled value and a promise is the only thing it can settle.

Component-level caching is the interesting one. Caching a component caches its HTML as well as its data, so a shared header
or a list that is the same for everyone stops being re-rendered per request.

## The cache key

An entry is keyed by four things:

| Part | Effect |
| --- | --- |
| the build id | a new deploy starts with an empty cache |
| the function's location and signature | two functions never share an entry |
| the arguments, including captured variables | different inputs, different entries |
| a development hash | editing the file invalidates it while you work |

## What can be cached

A cached result has to be serialisable: strings, numbers, booleans, dates, arrays, plain objects and promises of those. A
class instance with methods, a function, or a database client cannot be an entry.

A component also runs into the reverse case, which the docs warn about: passing a promise that resolves to runtime data
*into* a cached component makes the build wait for something it can never have.

```tsx
async function Cached({ promise }: { promise: Promise<unknown> }) {
  "use cache";
  const data = await promise;   // the build waits here forever
  return <p>...</p>;
}
```

The repair is the same as everywhere else in this chapter: await the runtime value in the component that is allowed to,
and pass the value rather than the promise.

## Caching a result that reads state

`getCatalogue` reads the loans, which change. That is allowed, and it is the trade the caching docs expect you to make
explicitly:

- the cached result is a snapshot, so a loan recorded after it was built does not appear in it;
- every write that changes a copy count has to invalidate the tag, or a librarian sees a stale shelf.

This application does the second thing in the loan action, and the revalidating page takes it apart:

```ts
updateTag("catalogue");
updateTag("stats");
```

The alternative design is to pass the changing values in as arguments, which puts them in the cache key:

```ts
export async function getCatalogue(loans: readonly Loan[]) {
  "use cache";
  // ...
}
```

That is more precise and less useful: every combination of loans becomes its own entry, and a busy library gets a cache
with one entry per day. The tag is how you keep one entry and stay honest about it.

## Extending a route with the same data cached

The build output is where you check that the caching you wrote is the caching you think you wrote:

```text
Route (app)                           Revalidate  Expire
├ ◐ /                                         1m      1h
├ ◐ /books
├   /books/[id]
│ ├ ◐ /books/dune                             1h      1d
│ └ ◐ [+2 more paths]
```

The two columns come from the cache lifetimes used on the route: the home page reads the minute-long stats, and a book page
reads the hour-long catalogue. A route that used no cached data at all shows neither number, because there is nothing for
the framework to schedule.

## What a deploy does to the cache

Every entry is keyed by the build id, so a deploy starts with an empty cache and does not carry the old entries over. That
is deliberate: it means a deploy cannot serve a page rendered by the previous version of your code. It also means the first
requests after a deploy do the work again, which is the reason a warm-up request belongs in a deploy script.

## Check yourself

Add the directive to `getOutstanding` with a lifetime of a minute, then record a loan and watch the home page. Note how
long the count stays wrong, then fix it by extending the loan action's invalidation, and say which of the two designs above
you ended up choosing and why.


The third line has a consequence that catches people. A cached function that closes over a variable from an outer scope
takes that variable into the key:

```ts
async function Component({ userId }: { userId: string }) {
  const getData = async (filter: string) => {
    "use cache";
    // the key covers userId from the closure and filter from the argument
    return db.query(userId, filter);
  };
}
```

That is usually what you want, and it is worth knowing when the number of entries surprises you. The other side of it is
the rule from the docs about request data: read `cookies()` or `headers()` outside the cached scope and pass the value in
as an argument, so the value is part of the key rather than invisible to it.
