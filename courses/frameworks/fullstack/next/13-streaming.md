---
title: Streaming
summary: A boundary turns a slow part of a page into a chunk, and the build refuses the version that blocks.
chapter: Data and caching
minutes: 13
status: draft
---

## One slow function

The home page shows the loans that are out, and the function behind that list is deliberately slow:

```ts
export async function getOutstanding(): Promise<OutstandingLoan[]> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return outstandingLoans().map((loan) => ({
    id: loan.id,
    member: loan.member,
    title: bookTitle(loan.bookId),
    dueOn: dueOn(loan),
    overdue: isOverdue(loan),
  }));
}
```

Eight hundred milliseconds is a stand-in for a query that is slow today. Nothing about this function says "cache", so it
runs on every request, and the page around it has to decide what to do about that.

## A boundary decides

```tsx
export default async function HomePage() {
  const stats = await getStats();

  return (
    <>
      <h1>Northside Library</h1>
      <p className="lede">A catalogue of {stats.titles} titles, a desk for the librarian, and a waiting list.</p>

      <ul className="stats">{/* copies, on loan, overdue */}</ul>

      <h2>Out on loan</h2>
      <Suspense fallback={<LoansSkeleton />}>
        <OutstandingList />
      </Suspense>
    </>
  );
}
```

The heading, the counts and the second heading are rendered and sent immediately. `OutstandingList` waits, and its
fallback is sent in its place:

```tsx
function LoansSkeleton() {
  return (
    <div className="panel" aria-busy="true">
      <div className="skeleton" style={{ width: "70%" }} />
      <div className="skeleton" style={{ width: "55%" }} />
      <div className="skeleton" style={{ width: "62%" }} />
    </div>
  );
}
```

When the data arrives, the same response carries the rest and React fills the boundary. The browser painted the top of
the page eight hundred milliseconds earlier than it otherwise could have.

## The rule the build enforces

Take the `await` out of the boundary and the build stops:

```text
Error: Route "/loans"
`fetch(...)`, `cookies()`, `headers()`, `params`, `searchParams`, or `connection()` accessed outside of
`<Suspense>` prevents the route from being prerendered, blocking the page load and leading to a slower user
experience.

Ways to fix this:
  - [stream] Provide a placeholder with `<Suspense fallback={...}>` around the data access
  - [cache] For uncached data (`fetch`, database calls): cache the access with `"use cache"`
  - [block] Set `export const instant = false` to allow a blocking route
```

Three options, and the choice between them is a design decision rather than a detail:

| Fix | Means |
| --- | --- |
| stream it | the page paints early, and the visitor waits for that section only |
| cache it | the data is the same for everyone, so it is computed once |
| block it | you have decided the whole page needs the data before anything paints |

The third is legitimate. A search results page whose every element depends on the query has nothing useful to show first,
and `export const instant = false` says so in the code rather than in a comment:

```ts
export const instant = false;
```

What the framework will not accept is the fourth option, which is blocking by accident. A page that waits on a query
because the `await` happened to end up above the boundary is slower for every visitor and nobody chose it.

## What streams and what does not

```text
static shell      the layout, the headings, anything cached
dynamic parts     each Suspense boundary, as its data arrives
the metadata      separately, when it depends on params
```

The metadata line is worth knowing about. A route whose `generateMetadata` awaits params reports this in development:

```text
Error: Route "/books/[id]": Next.js encountered runtime data in `generateMetadata()`.

This route's metadata is blocked, but the rest of its content can be prerendered.
```

The page still works, and the `<head>` arrives after the shell. For a catalogue the answer is `generateStaticParams`: with
the ids known at build time, the metadata is built with them and the warning goes away. For a route whose ids are unbounded
it is a trade to accept knowingly, and the search engine crawlers listed in the docs are the reason it matters.

## What streaming is not

Streaming does not make the data faster, and it does not hide a slow query from a visitor who is looking at the part that
needs it. It moves the waiting to where the information is, which is why the layout of a page decides how much it helps.

It also does not change the status line, which is sent with the shell: a `notFound()` raised inside a boundary cannot turn
the response into a 404. The dynamic segments page has the details.

## Check yourself

Add a second slow section to the home page and put one of them in a boundary and one of them outside it. Then load the page
with the network throttled, and time the first paint in both arrangements. Then decide which of the three fixes from the
build error belongs on the one outside the boundary.
