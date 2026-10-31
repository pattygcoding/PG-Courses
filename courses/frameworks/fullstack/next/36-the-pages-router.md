---
title: The Pages Router
summary: What came before the App Router, how to read it, and when to migrate.
chapter: Shipping
minutes: 13
status: draft
---

## The other folder

```text
pages/index.tsx              /
pages/books/index.tsx        /books
pages/books/[id].tsx         /books/dune
pages/api/books.ts           /api/books
pages/_app.tsx               wraps every page
pages/_document.tsx          the html document
```

Before the App Router there was exactly this: a `pages` folder, a file per route, and `_app` for what wraps everything. It
still works in the current version, which is why the project structure reference lists `pages` beside `app`, and a project can
contain both.

The two are not interchangeable in the way a rename suggests. The Pages Router has no server components, no server functions
and no cache primitives like `use cache`; its data fetching is four functions exported from a page file.

## The four functions

```tsx
export async function getServerSideProps(context) {
  const book = await getBook(context.params.id);

  if (!book) {
    return { notFound: true };
  }

  return { props: { book } };
}
```

That is a page rendered on every request: the function runs on the server, and its return value becomes the page's props.

```tsx
export async function getStaticProps() {
  const books = await getBooks();

  return { props: { books }, revalidate: 60 };
}
```

That is a page built once, with `revalidate: 60` standing in for a cache lifetime. A dynamic route adds a third:

```tsx
export async function getStaticPaths() {
  return { paths: [{ params: { id: "dune" } }], fallback: "blocking" };
}
```

Three functions, each with a name to remember and its own rules about what it may do. Comparing them with what this course
used is the fastest way to read an older application:

| App Router | Pages Router |
| --- | --- |
| a server component that awaits data | `getServerSideProps` |
| caching with a lifetime | `getStaticProps` with `revalidate` |
| `generateStaticParams` | `getStaticPaths` |
| a client component | any component, since nothing was server-only |
| a server function in an action | an API route called with `fetch` |
| `cookies()` in a component | `context.req.cookies` in a props function |
| `metadata` on a layout | `next/head` in the page |

The first row is the shift in one line. The Pages Router decided per page, with an exported function; the App Router decides
per component, with an await.

## API routes

```ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ books: [] });
}
```

An API route is a default export that receives a request and a response object, rather than a named export per verb returning
a `Response`. The route handlers page uses the Web API shape; this one uses Node's `req` and `res`, which is why older code
often reads `req.body` where newer code reads `await request.json()`.

## How to tell which one an application uses

```text
app/ and no pages/       the App Router
pages/ and no app/       the Pages Router
both                     a migration in progress, with app/ winning for any URL they share
```

The third case is supported rather than tolerated: a team can move one route at a time, and the App Router handles the URLs it
owns. It does not go the other way, so a URL cannot exist in both with different behaviour.

## When to migrate

Three honest answers:

**Read it, leave it.** An application that works, with a team that knows it, does not need a rewrite because a newer router
exists. The conventions are still supported, and the cost of a rewrite is a year of features that will not be built.

**Migrate the parts that need it.** A route that wants streaming, server functions or a cache lifetime is a candidate. That
page becomes an `app` route and the rest stays where it is.

**Migrate everything.** Worth it for an application that is growing into the walls of the old model, which in practice means
the four functions are being fought more often than they are being used.

The codemods are where to start, because the mechanical parts are the tedious ones:

```bash
npx @next/codemod@canary upgrade latest
npx @next/codemod@canary next-async-request-api .
npx @next/codemod@canary middleware-to-proxy .
```

The first upgrades the version, the second moves the synchronous request APIs to their promise forms, and the third renames
the middleware file. After the codemods the work is the interesting part: the four functions become awaited data inside
components, the pages become server components, and anything with state gets the directive at its edge.

## The two errors a migration ends with

Two route segment configs of the old model are the last traces to remove, and both fail the build rather than being ignored:

```text
Error: Route segment config "dynamicParams" is not compatible with `nextConfig.cacheComponents`. Please remove it.
Error: Route segment config "runtime" is not compatible with `nextConfig.cacheComponents`. Please remove it.
```

`runtime`, `dynamicParams` and the removed `experimental_ppr` flag all conflict with Cache Components, because the feature
requires the Node.js runtime and owns the prerendering decisions. A migration that reaches a green build with those gone has
moved the model rather than the folder.

## What is left to build

The library application has a prerendered shell, a cached catalogue that a write invalidates, actions with the authorisation
inside them, route handlers for the callers that want JSON, 34 unit tests, 6 end-to-end tests, and a container that serves it.

The next things to build are the ones this course left out on purpose. A database in place of the module, which keeps every
function signature and stops the loans living inside one process. A session instead of a desk cookie, which makes the check in
each action a real permission rather than a shared flag. A remote cache handler, once there is more than one instance to keep
in step.

Those three, in that order, are what turns the application into one other people can use, and the pages before this one are
the map for each of them.

## Check yourself

Take a page from a Pages Router application you have access to and rewrite its data fetching as an App Router page: the
`getServerSideProps` becomes an `await` in the component, the `getStaticProps` becomes a cached function with a lifetime, and
`getStaticPaths` becomes `generateStaticParams`. Then write down which of the four props of the old model you could not
reproduce, and why.
