---
title: Search params and forms
summary: The query string is a promise too, and reading it inside a boundary keeps the shell fast.
chapter: Routing
minutes: 13
status: draft
---

## The other request prop

```tsx
async function BookList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const catalogue = await getCatalogue();
  const books = searchBooks(catalogue, { q: first(params.q), genre: first(params.genre) });
```

```text
/books?q=le+guin&genre=science-fiction
  params.q      "le guin"
  params.genre  "science-fiction"
```

`searchParams` is a promise for the same reason `params` is, and it is a plain object rather than a `URLSearchParams`
instance. That is the first trap: there is no `.get()`, and the value may be an array.

```ts
/** The first value of a search parameter, which may arrive as an array. */
export function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
```

`?genre=poetry&genre=fiction` is a legal query string and Next.js hands over both values. A helper like this one is how
every application ends up reading them, and because it is a pure function it is also a good first unit test.

## Params are the path, search params are the query

| | `params` | `searchParams` |
| --- | --- | --- |
| where it comes from | the folder name, `[id]` | the query string |
| type | `Promise<{ id: string }>` | `Promise<Record<string, string \| string[] \| undefined>>` |
| typical use | one record | filtering, sorting, paging |
| who reads it | the page, or a child it passes it to | the same |

A record has a URL of its own, so it belongs in the path. A filter is a view of a list, so it belongs in the query. Put
the filter in the path and every combination needs a folder; put the record in the query and nothing is cacheable.

## Why the page does not await it

This is the whole of `app/books/page.tsx`:

```tsx
export default function CataloguePage(props: PageProps<"/books">) {
  return (
    <>
      <h1>Catalogue</h1>
      <p className="lede">Search by title or author, or filter by genre.</p>

      <Suspense fallback={<FiltersSkeleton />}>
        <SearchForm />
      </Suspense>

      <Suspense fallback={<ListSkeleton />}>
        <BookList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
```

The page function is not `async` and awaits nothing. The heading and the two boundaries are prerendered into a shell that
the server can send before it knows anything about the request, and the query string is read inside the second boundary.

Move `await searchParams` up into the page and the route stops being prerenderable at all:

```text
Error: Route "/loans"
`fetch(...)`, `cookies()`, `headers()`, `params`, `searchParams`, or `connection()` accessed outside of
`<Suspense>` prevents the route from being prerendered, blocking the page load and leading to a slower user
experience.
```

The build is the first place you meet it, which is the good outcome: the framework refuses to ship the slow version rather
than leaving it to a review.

## The form that keeps its values

A search form is a GET form. The browser puts the fields in the query string and the server filters:

```tsx
<form className="filters" action="/books" method="get">
  <input id="q" name="q" type="search" defaultValue={q} />
  <select id="genre" name="genre" defaultValue={genre}>
    <option value="">All genres</option>
    <option value="science-fiction">Science fiction</option>
  </select>
  <button type="submit">Filter</button>
</form>
```

Submitting that form gives `/books?q=le+guin&genre=science-fiction`. It works with JavaScript disabled, the URL can be
shared, and the back button behaves.

What it does not do on its own is keep the fields filled in after the submit. `defaultValue={q}` needs `q`, and the page
cannot read the query string without giving up its shell. The form is therefore a client component that reads the current
URL:

```tsx
"use client";

import { useSearchParams } from "next/navigation";

export function SearchForm() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
```

It is wrapped in its own `Suspense` boundary as well, because `useSearchParams` is request data on the client and the
shell has to render without it. Two boundaries, two reasons: the form needs the URL, and the list needs the data.

## A client component can read params too

A client page cannot be `async`, so the promise is read with React's `use`:

```tsx
"use client";

import { use } from "react";

export default function Page({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = use(params);
  const { query } = use(searchParams);
```

Reach for this only when the whole page really is a client component. A server page that reads the params and passes the
values down is smaller and does the same work.

## Check yourself

Add a `sort` search param to the catalogue that reorders the list by title, author or year, and give the select a default
of title. Then open two tabs with different sorts and check that the field each tab shows matches its own URL, with no
client state holding the value.
