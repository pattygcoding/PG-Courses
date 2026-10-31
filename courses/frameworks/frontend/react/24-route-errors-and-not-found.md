---
title: Route errors and not found
summary: The error element, the 404 from a loader, and the difference between a missing page and a broken one.
chapter: Routing
minutes: 12
status: draft
---

## One error element for the whole section

```tsx
{
  path: '/',
  element: <Layout />,
  errorElement: <RouteError />,
  children: [
    // every route in the application
  ],
}
```

```tsx
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

/** What a route renders when a loader throws a Response or a component throws. */
export function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <section>
        <h1>{error.status}</h1>
        <p>{typeof error.data === 'string' ? error.data : error.statusText}</p>
        <Link to="/books">Back to the catalogue</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Something went wrong</h1>
      <p role="alert">
        {error instanceof Error ? error.message : 'An unexpected error reached the route.'}
      </p>
      <Link to="/books">Back to the catalogue</Link>
    </section>
  );
}
```

`errorElement` replaces the route's element when a loader, an action or a render throws. It sits inside the
layout, so the header stays and only the page is replaced, which is one more reason to hang it on the layout
route rather than on the root.

`useRouteError` returns whatever was thrown, and `isRouteErrorResponse` tells a thrown `Response` apart from a
thrown `Error`. That check is the important one: a `Response` has a status and a body, and an `Error` has a
message that is meant for a log rather than for a page.

The test that covers it drives the real router:

```ts
it('shows the error element for a book that does not exist', async () => {
  stubApi({ '/api/books/missing.json': { status: 404, json: {} } });

  await renderAt('/books/missing');

  expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument();
  expect(screen.getByText('That book is not in the catalogue.')).toBeInTheDocument();
});
```

## A 404 from a loader

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

Throwing a `Response` rather than returning a sentinel is what makes the distinction between "not there" and
"broken" travel to the page with its status intact. The loader reads the API's status, the element renders it,
and the component that would have handled a missing book never has to exist.

`error.data` is the body. A string is what `new Response('...')` gives, and an object is available if the
loader throws one:

```ts
throw new Response(JSON.stringify({ code: 'LOAN_LIMIT' }), {
  status: 409,
  headers: { 'Content-Type': 'application/json' },
});
```

## A path that matches nothing

```ts
{ path: '*', element: <NotFound /> }
```

An `errorElement` is for a route that exists and failed. A path nobody wrote is a different problem, and a
catch-all route is the honest answer because it is not an error: the application can render a page that helps.
The catalogue's route table sends unknown paths to the catalogue instead, which is the same idea with a
redirect.

```ts
{ path: '*', loader: () => redirect('/books') }
```

Which of the two to use is a judgement about the product. A documentation site wants a real "not found" page
with search; a single page application with one useful list may as well redirect.

## Two kinds of boundary

| Wraps | Catches | Renders |
| --- | --- | --- |
| `errorElement` on a route | loader, action and render errors for that subtree | a page |
| an `ErrorBoundary` component | render errors below it | a panel |

They compose. The route's element catches a failed loader; a boundary inside the page catches a panel that
threw while rendering, and keeps the rest of the page useful. The catalogue uses both: the root route has an
`errorElement`, and the waiting list has a boundary around it.

## What a person should see

```tsx
<p role="alert">
  {error instanceof Error ? error.message : 'An unexpected error reached the route.'}
</p>
```

A message from a thrown `Error` is written for a developer. In a production build the useful thing is a
sentence that says what to do next, plus an identifier the support conversation can use:

```tsx
<p role="alert">
  Something went wrong loading this page. The reference for this failure is {reference}.
</p>
```

The reference comes from the logging call in `componentDidCatch` or from the router's `onError` option, and it
is how a report from a person becomes a log line. In development, showing the real message is the better
trade, which is what the `import.meta.env.DEV` flag is for.

## Check yourself

Add a route that throws a 403 from its loader and render it, then make the same route throw a plain `Error` and
compare what the element shows. Finally, add a catch-all route and decide whether it should render a page or
redirect, writing down the reason.
