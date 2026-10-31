---
title: Route handlers
summary: A route.ts file is an HTTP endpoint, and it follows the same prerendering rules as a page.
chapter: Data and caching
minutes: 13
status: draft
---

## A file that answers a request

```ts
export async function GET() {
  return Response.json({ message: "Hello World" });
}
```

That is a complete endpoint at the URL the folder names. The verbs are the exported function names: `GET`, `POST`, `PUT`,
`PATCH`, `DELETE`, `HEAD` and `OPTIONS`, and Next.js answers `OPTIONS` for you when you do not.

This application has two of them, and the list one is worth reading in full:

```ts
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { genreLabel, searchBooks } from "@/lib/books";
import { getCatalogue } from "@/lib/data";
import { first } from "@/lib/params";

/** GET /api/books?q=dune&genre=poetry */
export async function GET(request: NextRequest) {
  const catalogue = await getCatalogue();
  const books = searchBooks(catalogue, {
    q: first(request.nextUrl.searchParams.getAll("q")),
    genre: first(request.nextUrl.searchParams.getAll("genre")),
  });

  return Response.json({
    count: books.length,
    books: books.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      genreLabel: genreLabel(book.genre),
      available: book.available,
      copies: book.copies,
    })),
  });
}
```

```bash
curl -s "http://localhost:3000/api/books?genre=poetry"
```

```text
{"count":1,"books":[{"id":"the-poetic-edda","title":"The Poetic Edda","author":"Anonymous","genre":"poetry",
"genreLabel":"Poetry","available":4,"copies":4}]}
```

Three things to notice. It calls the same cached `getCatalogue` the pages call, so the JSON and the HTML cannot disagree. It
maps the records to a shape that is deliberately narrower than the internal type, which is what an API should promise. And it
reads the query string with `request.nextUrl.searchParams`, which is a real `URLSearchParams` rather than the plain object a
page receives.

## Params, typed the same way

```ts
export async function GET(_request: NextRequest, context: RouteContext<"/api/books/[id]">) {
  const { id } = await context.params;
  const book = await getCatalogueEntry(id);

  if (!book) {
    return Response.json({ error: "That book is not in the catalogue." }, { status: 404 });
  }

  return Response.json({ id: book.id, title: book.title /* ... */ });
}
```

`RouteContext` is generated from the route literal, exactly like `PageProps`, so `context.params` is a promise for
`{ id: string }` and nothing else. The untyped form works too:

```ts
export async function GET(request: Request, { params }: { params: Promise<{ team: string }> }) {
  const { team } = await params;
}
```

## GET is dynamic by default

Since version 15 a `GET` handler is rendered per request unless it says otherwise, and with Cache Components it follows the
same prerendering model as a page. The build output marks it:

```text
├ ƒ /api/books
├ ƒ /api/books/[id]
```

A static JSON document is still possible, with a segment config that says so:

```ts
export const dynamic = "force-static";
```

The same file can export `dynamicParams`, `revalidate`, `fetchCache` and `preferredRegion`. One of the older options is not
available: `runtime` cannot be set in an application with Cache Components, because the feature requires Node.js.

## Status codes and headers

```ts
if (!book) {
  return Response.json({ error: "That book is not in the catalogue." }, { status: 404 });
}

return Response.json({ revalidated: true, at: new Date().toISOString() }, { status: 202 });
```

Web `Response` is the whole API, so status, headers and cookies are set the way you would set them in a service worker:

```ts
return new Response(xml, { headers: { "Content-Type": "text/xml" } });
```

There is no body parser to configure, unlike the API routes of the Pages Router, and a form upload arrives as a `FormData`
you can read directly:

```ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const name = formData.get("name");
}
```

## What a handler is good for

| Use | Why a handler rather than a page |
| --- | --- |
| a client-side fetch after the first render | the browser needs JSON, not HTML |
| a webhook from another service | the caller is not a browser |
| an RSS or XML feed | the response is not a document |
| a health check for a load balancer | it needs a status code and nothing else |

For data a page needs on first paint, a handler is the wrong tool: it turns one render into two round trips, and the page
could have had the data already. Where both are needed, as here, have them share the data layer rather than having one call
the other over HTTP.

## Check yourself

Add a `DELETE` handler to `/api/books/[id]` that refuses when copies are out on loan and returns 409 when they are. Then
call it with `curl` against a book with an outstanding loan and against one without, and check both status codes.
