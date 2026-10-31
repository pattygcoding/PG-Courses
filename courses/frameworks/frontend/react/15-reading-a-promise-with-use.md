---
title: Reading a promise with use
summary: A loader starts the request and a component reads it, with no effect and no loading state of its own.
chapter: Effects and data
minutes: 13
status: draft
---

## The loader starts it, the component reads it

```ts
{
  path: 'books/:id',
  element: <BookDetail />,
  loader: async ({ params, request }: LoaderFunctionArgs) => {
    const book = await fetchBook(params.id ?? '', request.signal);

    // Started here and not awaited, so the waiting list streams in.
    return { book, waiting: fetchBacklog(book.genre) };
  },
},
```

```tsx
export function BookDetail() {
  const { book, waiting } = useLoaderData() as BookDetailData;

  return (
    <section>
      <h1>{book.title}</h1>

      <ErrorBoundary fallback={<p role="alert">The waiting list is unavailable.</p>}>
        <Suspense fallback={<p>Counting the waiting list...</p>}>
          <WaitingList genre={book.genre} waiting={waiting} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}
```

```tsx
export function WaitingList({ genre, waiting }: WaitingListProps) {
  const backlog = use(waiting);
  // ...
}
```

The pattern in one sentence: everything that must be ready for the page to be useful is awaited in the
loader, and everything that can arrive a moment later is returned as a promise and read with `use` further
down. The heading and the author are on screen immediately, and the waiting list fills in when it is ready.

`use` is not a data fetching API. It reads a value that is already promised by somebody else, and it suspends
the component until the promise settles. That is why the promise has to come from a loader, a cache or a prop
rather than being created in the component.

## The promise has to be stable

```tsx
// works: the promise arrived in a prop that does not change between renders
const backlog = use(waiting);

// every render makes a new promise, and React cannot track it
const backlog = use(fetchBacklog(genre));
```

React keeps a note of every promise it has seen and refuses to suspend on one it cannot identify, with an
error that says so:

```text
A component was suspended by an uncached promise. Creating promises inside a Client Component or hook
is not yet supported. To fix, you will need to unwrap the promise outside the Client Component.
```

The fix is to move the creation up: into the loader, into a cache keyed by the arguments, or into an effect
that stores the promise in a ref. The first of those is the one this project uses, and it is the one React's
documentation recommends.

## Repeated renders do not restart it

```tsx
<WaitingList genre={book.genre} waiting={waiting} />
```

Once the promise has settled, every later render of the component reads the resolved value synchronously.
Navigating away and back runs the loader again, which produces a new promise, and the boundary suspends once
more. There is no cache in `use`, and there is no refetch on re-render, because the promise is the cache.

## `use` also reads context

```tsx
const value = use(SessionContext);
```

`useContext` is the hook, and `use` does the same thing with the same tracking. There is no reason to prefer
it for context, and the two shapes are worth recognising next to each other because documentation mixes them.

## What the page looks like while it waits

| Moment | What is rendered |
| --- | --- |
| the navigation starts | the previous page, until the loader resolves |
| the loader resolves, the waiting list is pending | the book, plus the Suspense fallback |
| the waiting list resolves | the book and the list |
| the waiting list rejects | the book, plus the boundary's fallback |
| the loader rejects with a Response | the route's `errorElement` |

Five states from one page and two small wrappers around one component. The effects chapter's version of the
same page would need three pieces of state, an abort controller and a branch per state, and it would still
show an empty frame while the book was arriving.

## Where it fits with the rest

A promise read with `use` needs two things above it: a `Suspense` boundary for the pending moment and an error
boundary for the rejected one. Put both around the smallest component that reads the promise, and the rest of
the page keeps working while that part waits, fails or arrives.

## Check yourself

Add a second promise to the loader for the book's cover image, read it in a component with `use`, and wrap
each one in its own Suspense boundary with a fallback of roughly the right size. Then move one of them inside
the component that reads it and read the error React gives you.
