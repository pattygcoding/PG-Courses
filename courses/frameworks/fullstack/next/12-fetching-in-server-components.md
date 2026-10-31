---
title: Fetching in server components
summary: A component can be async, identical fetches are memoised, and nothing is cached unless you say so.
chapter: Data and caching
minutes: 14
status: draft
---

## An async component

```tsx
export default async function BookPage(props: PageProps<"/books/[id]">) {
  const { id } = await props.params;
  const book = await getCatalogueEntry(id);
```

A server component may be an `async` function. That is the whole mechanism: `await` at the top of the component, and the
result rendered below. There is no loading flag to set, because the component does not render until the data is there.

The data layer it calls is ordinary TypeScript:

```ts
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

That function reads a module rather than a database, and the shape it returns is what a query would return. A real
application would have a connection pool in `lib/db.ts` and the same function signature, which is why nothing in this
chapter changes when you swap one for the other. The credentials for that connection stay on the server, and the
serialisation boundary from the server components page means they cannot reach the browser.

## Nothing is cached unless you ask

```tsx
const data = await fetch("https://api.example.com/books");
```

A `fetch` in a server component runs on every request. It is not cached, and the page waits for it unless you cache the
result with `'use cache'` or wrap the component in a `Suspense` boundary. This is the opposite of the older model, and it
is the change most likely to surprise someone porting an application: data that used to be frozen is now live.

Two things remain free:

- **Identical fetches are memoised.** Two components in one render asking for the same URL make one request, so data does
  not have to be lifted to a parent only to avoid duplication.
- **A cached function is memoised too.** Two components calling the same `'use cache'` function in one render get the same
  result, and across requests get the cached one.

## Reading the same thing twice

This is what memoisation is for. The book page needs the catalogue entry, and so does `generateMetadata`:

```tsx
export async function generateMetadata(props: PageProps<"/books/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const book = await getCatalogueEntry(id);

  if (!book) {
    return { title: "Book not found" };
  }

  return { title: book.title, description: `${book.title} by ${book.author}, ${book.year}.` };
}
```

The two calls do not fetch twice: `getCatalogueEntry` reaches `getCatalogue`, which is cached, so the second call is a
cache hit within the same render.

With a database client rather than a cached function, the tool is React's own `cache`, which dedupes by arguments for the
life of one request:

```ts
import { cache } from "react";

export const getBook = cache(async (id: string) => db.book.findUnique({ where: { id } }));
```

The difference from `'use cache'` is the lifetime: `cache` is per request, and `'use cache'` is across requests until it
expires or is invalidated.

## Parallel rather than sequential

Awaited one after another, two fetches take as long as both:

```tsx
const book = await getBook(id);
const loans = await getLoans(id);
```

Started together, they take as long as the slower one:

```tsx
const [book, loans] = await Promise.all([getBook(id), getLoans(id)]);
```

The second form has a cost, which is that neither result can be used to decide whether to make the other request. Where
one depends on the other, sequential is correct: the second request does not exist until the first answers.

A third option exists for the case where a child needs data a parent is about to work out anyway. The docs call it
preloading:

```ts
export const preload = (id: string) => {
  void getItem(id);
};
```

Calling `preload(id)` starts the work without awaiting it, and the component that renders later finds the promise already
resolved. It is worth reaching for when a page does two things and one of them is a slow lookup, and it is worth not
reaching for when the code is already fast enough.

## Where a query belongs

Three answers, and the trade is between reuse and distance:

| Place | When |
| --- | --- |
| in the component that renders it | one page uses it, and the component is not shared |
| in `lib/`, called by components | several pages need it, which is this application |
| in a route handler the client calls | the data is needed after a navigation, in the browser |

The third is the only one that puts the query behind an HTTP request of your own. It is the right answer for a
client-side filter and the wrong answer for a first paint, which can be rendered with the data already in it.

## Check yourself

Add a second call to `getCatalogue()` in a child component of the catalogue page, then log a line inside the cached
function and count how many times it prints for one request. Then remove `'use cache'` and count again, and explain the
difference in terms of what the cache key covers.
