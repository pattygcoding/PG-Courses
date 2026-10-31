---
title: Metadata and SEO
summary: A title template on the layout, a function when it depends on the record, and the two generated files.
chapter: The app around the pages
minutes: 13
status: draft
---

## A static export

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Northside Library",
    template: "%s | Northside Library",
  },
  description: "A catalogue, a desk and a waiting list, built with the Next.js App Router.",
};
```

Next.js renders that into the document's `<head>`. A page then sets only its own part:

```ts
export const metadata = {
  title: "Desk",
};
```

```text
<Desk | Northside Library>
```

The template applies because the page sits below the layout that declared it. The same object takes `description`,
`openGraph`, `twitter`, `alternates`, `robots` and `icons`, and a page can override any of them.

## A function when the page has a record

```tsx
export async function generateMetadata(props: PageProps<"/books/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const book = await getCatalogueEntry(id);

  if (!book) {
    return { title: "Book not found" };
  }

  return {
    title: book.title,
    description: `${book.title} by ${book.author}, ${book.year}.`,
  };
}
```

Opening a book in a browser tab shows `Dune | Northside Library`, and the not-found path sets its own title, which is how the
404 page a visitor sees is labelled correctly in the tab and in a crawler's index.

`generateMetadata` is called with the same props as the page, including the promise for `params`, and it can share the data
layer with the page because `getCatalogueEntry` is cached: two calls, one cache hit.

Metadata that depends on params is a trade the framework makes visible. In development:

```text
Error: Route "/books/[id]": Next.js encountered runtime data in `generateMetadata()`.

This route's metadata is blocked, but the rest of its content can be prerendered. `cookies()`, `headers()`,
`params`, or `searchParams` accessed in `generateMetadata()` cause it to run dynamically.

Ways to fix this:
  - [static] Use a static metadata export instead of `generateMetadata()`
  - [dynamic] Render a marker component that calls `await connection()` inside `<Suspense>` on the page
```

The repair in this application is `generateStaticParams`: with the ids known at build time, each book page is built with its
metadata and the route table shows the pages one by one. A route whose ids cannot be listed has to choose between metadata
later in the stream and a page that cannot be prerendered. The framework prints the trade rather than hiding it, which is the
reason to run a development server while writing this kind of code.

## Files with reserved names

Two file conventions replace a package and a config:

```ts
import type { MetadataRoute } from "next";

import { books } from "@/lib/books";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/books`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    ...books.map((book) => ({
      url: `${BASE_URL}/books/${book.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
```

`app/sitemap.ts` is served at `/sitemap.xml`, and the response is the document you would otherwise hand-write:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>http://localhost:3000/</loc>
<lastmod>2026-10-31T15:00:06.479Z</lastmod>
<changefreq>daily</changefreq>
```

`app/robots.ts` is the same idea for `/robots.txt`:

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/loans", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

```text
User-Agent: *
Allow: /
Disallow: /loans
Disallow: /api/

Sitemap: http://localhost:3000/sitemap.xml
```

Both files are promises-free functions that return data, and both are built from the same source the pages use, which is what
keeps them from drifting.

## The rest of the head

| File | Serves |
| --- | --- |
| `app/favicon.ico` | the tab icon |
| `app/icon.svg` | a vector icon |
| `app/apple-icon.png` | the home-screen icon |
| `app/opengraph-image.tsx` | the social card, generated with `ImageResponse` |
| `app/twitter-image.tsx` | the same for Twitter's card |

All of them are file conventions: create the file and the `<link>` or `<meta>` tag appears. The generated images need one more
thing to be useful:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
};
```

Without a base URL, a relative Open Graph image path cannot be turned into the absolute URL a scraper needs, and the card
silently fails to appear.

## What not to automate

The sitemap, the robots file and the tags are the mechanical half of SEO. The half that decides whether a page ranks is the
content and the structure: one `<h1>`, headings in order, links with text in them, and a page that loads. A metadata library
does not fix a page that answers 200 with a not-found body, which is exactly the case this application has for an unknown
book and exactly why the status line is worth a paragraph on its own.

## Check yourself

Fetch `/sitemap.xml` and `/robots.txt` from your application and check every URL in the sitemap resolves with the status you
expect. Then add an `opengraph-image.tsx` and paste the page URL into a link preview tool, and see whether the card needs
`metadataBase` to appear.
