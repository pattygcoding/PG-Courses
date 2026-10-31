---
title: Dynamic segments
summary: A folder in brackets is one URL value, and generateStaticParams decides which of them are built.
chapter: Routing
minutes: 14
status: draft
---

## The folder name is the parameter

```tsx
export default async function BookPage(props: PageProps<"/books/[id]">) {
  const { id } = await props.params;
  const book = await getCatalogueEntry(id);

  if (!book) {
    notFound();
  }
```

```text
/books/dune                          params.id is "dune"
/books/a-brief-history-of-time       params.id is "a-brief-history-of-time"
```

`params` is a promise, and it has been since version 15. Awaiting it is not optional; the old synchronous access was kept
for one version as a compatibility period and is gone now.

The page props helper makes the two props typesafe from the route literal:

```tsx
export default async function BookPage(props: PageProps<"/books/[id]">) {
```

Typing the literal means `props.params` resolves to `Promise<{ id: string }>` for this route and nothing else, and a
typo in the literal is a compile error rather than a page that never matches.

## The three shapes

| Folder | URL | `params` |
| --- | --- | --- |
| `[id]` | `/books/dune` | `{ id: "dune" }` |
| `[...slug]` | `/books/a/b` | `{ slug: ["a", "b"] }` |
| `[[...slug]]` | `/books` and `/books/a` | `{ slug: undefined }` or `{ slug: ["a"] }` |

A catch-all is how one page serves a whole hierarchy, such as documentation under `/docs/a/b/c`. The optional form is the
same idea with a working index page, which is the only difference between `[...slug]` and `[[...slug]]`.

## Which ids are built ahead of time

```ts
export function generateStaticParams() {
  return books.map((book) => ({ id: book.id }));
}
```

Add that to the page and the build prerenders every one of those URLs. The route table shows them separately, with the
revalidate and expire times that came from the cache lifetime of the data they read:

```text
├   /books/[id]
│ ├ ◐ /books/[id]
│ ├ ◐ /books/dune                             1h      1d
│ ├ ◐ /books/a-brief-history-of-time          1h      1d
│ └ ◐ [+2 more paths]
```

Two things follow from that shape:

- The listed ids are served from the prerendered shell immediately.
- Any other id is served the shell as well, then upgraded in the background once its params are known, and cached for the
  next visitor. That is the long tail of a catalogue: one build covers the popular titles, and the rest cost one render
  each.

## An unknown id and the status line

The application renders `notFound()` for an id that is not in the catalogue, and the not-found page is what a visitor
sees. The status code is a different matter:

```bash
curl -s -o NUL -w '%{http_code}' http://localhost:3000/books/no-such-book
```

```text
200
```

The reason is the order of events. The shell is streamed first, so the status line has already gone out when `notFound()`
runs inside the boundary. Rejecting the id at the routing level would fix it, and the option that does exactly that is not
available here:

```text
Error: Route segment config "dynamicParams" is not compatible with `nextConfig.cacheComponents`.
Please remove it.
```

So with Cache Components there are two honest choices: accept the 200 with the not-found page in the body, or move the
lookup out of the boundary so the id is checked before anything is sent. The second costs the instant shell, which is the
thing the rest of this chapter is about. For an API consumer, a route handler is the third answer, and it returns a real
404 because nothing has been streamed.

## The instant shell rule

An earlier version of this page awaited its params in the page body, and the framework said so:

```text
Error: Route "/books/[id]": Next.js encountered URL data during prerendering or a navigation.

`params` or `searchParams` accessed outside of `<Suspense>` may prevent the navigation from being instant,
leading to a slower user experience.
```

The repair is a small restructuring: the page awaits nothing, and a child component inside a `Suspense` boundary does the
work.

```tsx
export default function BookPage(props: PageProps<"/books/[id]">) {
  return (
    <Suspense fallback={<BookSkeleton />}>
      <BookBody params={props.params} />
    </Suspense>
  );
}

async function BookBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // the cached catalogue, the cookie check and the markup
}
```

The page is now the shell: header, footer and a skeleton, all prerendered. The book arrives a moment later. `BookBody` is
passed the promise rather than the value, which is what lets React start rendering the shell at all.

## Check yourself

Add a catch-all route under `/shelf/[...path]/page.tsx` that renders the segments it was given. Then add
`generateStaticParams` for two of them, run `next build`, and find the difference in the route table between the ids you
listed and an id you did not.
