---
title: Loaders and revalidation
summary: Data before the page renders, and the hook that decides when a loader runs again.
chapter: Routing
minutes: 14
status: draft
---

## The loader runs before the page

```ts
{
  path: 'books',
  element: <BookList />,
  loader: ({ request }: LoaderFunctionArgs) => fetchBooks(request.signal),
  shouldRevalidate: ({ currentUrl, nextUrl }: ShouldRevalidateFunctionArgs) =>
    currentUrl.pathname !== nextUrl.pathname,
},
```

```tsx
export function BookList() {
  const books = useLoaderData() as readonly Book[];
  // ...
}
```

The router calls the loader, waits for it, and only then renders the route's element. `useLoaderData` returns
what it resolved, so the component has no loading state of its own for the first render: the list is either
absent because the navigation is still in flight or present with data.

`request.signal` is worth passing to `fetch`. A navigation that leaves the route before the response arrives
aborts the loader's request, which is one less request left running for a page nobody is on.

React Router types are structural rather than inferred here. `useLoaderData()` returns `unknown` unless the
project is using the router's type generation, so this project casts:

```tsx
const books = useLoaderData() as readonly Book[];
```

A cast is a promise, which is the trade. The type generator in framework mode removes it, and the alternative
here is a `parse` at the boundary, which is more code than a course project needs.

## Revalidation, and how to avoid it

By default, a navigation runs the loader for every route that is leaving, staying or arriving. That is why a
filter change would refetch the whole catalogue, and why the route above says otherwise:

```ts
shouldRevalidate: ({ currentUrl, nextUrl }) => currentUrl.pathname !== nextUrl.pathname,
```

Now a change to the query string leaves the loaded data alone, and a change of path fetches again. The test
pins it:

```ts
await user.type(screen.getByLabelText('Search the catalogue'), 'dune');

await vi.waitFor(() => {
  expect(router.state.location.search).toBe('?q=dune');
});

// The write is debounced, and the loader result is reused rather than fetched again.
expect(fetchMock.mock.calls.filter((call) => String(call[0]).includes('/books.json'))).toHaveLength(1);
```

Two things are being checked at once there: the URL gets the term, and the list was not fetched a second time.

The function is also the place to answer questions the default gets wrong:

| Situation | `shouldRevalidate` returns |
| --- | --- |
| a filter changed, the list did not | `false` |
| a form submitted and the list may have changed | `true` |
| only some parameters matter | compare `currentParams` with `nextParams` |
| the action returned validation errors | `false`, because nothing was written |

## Errors from a loader

```ts
export async function fetchBook(id: string, signal?: AbortSignal): Promise<Book> {
  const response = await fetch(`${base}/books/${encodeURIComponent(id)}.json`, { signal });

  if (response.status === 404) {
    throw new Response('That book is not in the catalogue.', { status: 404 });
  }

  if (!response.ok) {
    throw new Response('The book could not be read.', { status: response.status });
  }

  return (await response.json()) as Book;
}
```

Throwing a `Response` is how a loader says "this route cannot render, here is the status". The router renders
the route's `errorElement` instead of the element, which the last page of this chapter covers, and the component
never sees a failure it would have to handle.

An error that is not a `Response` also lands in the `errorElement`, so a bug in a loader shows the same page
with a different message rather than a blank screen.

## Loaders, actions and the order they run

```text
navigation to a route
  -> the loaders for every route that stays or arrives run, in parallel
  -> the element renders with the data

submission of a form to a route action
  -> the action runs
  -> returns data: the page re-renders with useActionData, loaders do not re-run
  -> returns a redirect: the target route's loaders run before it appears
  -> returns nothing: the current route's loaders run again
```

The third case is the refresh: an action that writes and returns nothing means "everything on this page may be
stale", and the router does what a reload would do without the round trip through the browser.

## The pending state

```tsx
const navigation = useNavigation();
```

```tsx
{navigation.state !== 'idle' && (
  <p className="pending shell" role="status">
    Loading the next page...
  </p>
)}
```

`navigation` also carries the values worth showing during a slow submit: `navigation.formData` is the data
being submitted, and `navigation.location` is where the application is heading. A progress bar at the top of
the page and a disabled submit button usually come from those two.

## What the response looks like

```json
[
  { "id": "dune", "title": "Dune", "author": "Frank Herbert", "genre": "science-fiction", "copies": 3 },
  { "id": "a-brief-history-of-time", "title": "A Brief History of Time", "author": "Stephen Hawking", "genre": "non-fiction", "copies": 2 }
]
```

That is `public/api/books.json` in this project, served as a static file by the dev server. A real API returns
the same shape from a database, and nothing in the route table changes when it does, which is the point of
fetching in the loader rather than in the component.

## Check yourself

Give the reports route a loader that fetches the report and returns it, and change the component to read the
data instead of using `useReport`. Then find a navigation in your own application that fetches more than it
needs and write the `shouldRevalidate` that stops it.
