---
title: Testing components
summary: Queries that read like a person, a stub that answers like the API, and assertions on what was asked for.
chapter: Testing
minutes: 15
status: draft
---

## Query by what it is

```ts
expect(await screen.findByRole('link', { name: 'Dune' })).toBeInTheDocument();
expect(screen.getByText('2 of 2 books')).toBeInTheDocument();
expect(screen.queryByRole('link', { name: 'Dune' })).not.toBeInTheDocument();
```

Three queries, three shapes of assertion, and none of them reaches into the component:

- `findByRole` waits for the element to appear, which is what an async render needs. `getBy` throws at once, and
  `queryBy` returns `null` so it can be asserted against.
- `getByRole('link', { name: 'Dune' })` finds the element the way assistive technology does, by its role and its
  accessible name. A test written this way fails when a change makes the page less accessible, which is the
  point.
- Nothing queries by class name or by position in a list. A test that asks for `section > ul > li:nth-child(1)`
  breaks when the markup changes and passes when the behaviour does not.

The names come from the markup this project already has: a `<label htmlFor>` for a field, an `<h1>` for the
heading, a `role="status"` for a message.

```ts
await user.type(screen.getByLabelText('Search the catalogue'), 'edda');
await user.click(screen.getByRole('button', { name: 'Record loan' }));
await user.selectOptions(screen.getByLabelText('Genre'), 'poetry');
```

`user-event` fires the events a browser fires, including the ones React listens for. `fireEvent` exists and is a
lower level: it dispatches one event and does nothing else, which is why a single `fireEvent.change` on a select
can leave the model untouched.

## Render the application, not a fragment

```tsx
export async function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  await act(async () => {
    render(
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>,
    );
  });

  return router;
}
```

```ts
const router = await renderApp('/books');
```

Three decisions, and each one buys something:

- `createMemoryRouter` with the real `routes`, so the test exercises the real loaders, the real actions and the
  real redirects. A test that renders one component in isolation cannot catch a route that points at the wrong
  component.
- The provider from `main.tsx`, because the layout reads the session. Leaving it out gives
  `Error: useSession must be used inside a SessionProvider`, which is a clear failure rather than a mystery.
- The awaited `act`, which the next page explains: a route whose loader resolves asynchronously leaves React work
  that has to be flushed before the test looks at the DOM.

The function returns the router because a test often wants to assert on the URL:

```ts
await vi.waitFor(() => {
  expect(router.state.location.search).toBe('?q=dune');
});
```

## Answer the network from a table

```ts
export function stubApi(routes: Record<string, Stub>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = urlOf(input);
    const match = Object.entries(routes).find(([path]) => url.includes(path));

    if (match === undefined) {
      return new Response(JSON.stringify({ error: `no stub for ${url}` }), { status: 404 });
    }

    const [, stub] = match;

    return new Response(JSON.stringify(stub.json ?? {}), {
      status: stub.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
```

```ts
stubApi({
  '/api/books.json': { json: BOOKS },
  '/api/loans': { status: 201, json: { id: 'loan-1', dueOn: '2026-11-14' } },
});
```

The stub is a table of paths to responses, which is enough for everything in this project and shorter than a
mocking library. Three details make it work with `fetch`:

- It returns real `Response` objects rather than plain objects. A stub that resolves a plain object fails inside
  the code under test at `response.ok`, with a confusing error. I made that mistake while writing `useReport`'s
  test, and the failure read `expected undefined to be '2026-10-31'`.
- The match is a substring rather than an exact path, so a URL carrying a query string still matches.
- It returns the mock, so a test can assert on what was sent.

```ts
export function bodyOf(fetchMock: ReturnType<typeof vi.fn>, method: string): Record<string, unknown> {
  const call = fetchMock.mock.calls.find(
    (entry) => (entry[1] as RequestInit | undefined)?.method === method,
  );

  return JSON.parse(String((call?.[1] as RequestInit | undefined)?.body)) as Record<string, unknown>;
}
```

```ts
expect(bodyOf(fetchMock, 'POST')).toEqual({ member: 'Ada Lovelace', bookId: 'dune', days: 14 });
```

That assertion catches a form sending the wrong field names, which is a bug no rendering test finds.

## The four tests a feature earns

```ts
it('shows the message the action returned under each field', async () => { /* the failure case */ });
it('posts the loan and lands on the receipt', async () => { /* the happy path */ });
it('remembers the member name for the next visit', async () => { /* persistence */ });
it('sends a signed out visitor to the catalogue', async () => { /* the guard */ });
```

| Test | What it pins |
| --- | --- |
| the happy path | the feature works at all |
| the failure the API produces | the message, and that nothing was written |
| the empty state | what renders when there is no data |
| the boundary a guard protects | a redirect, a 404, a missing permission |

Those four cover what a review asks about. A test for every branch of a template costs more to maintain than it
catches, and the states a page can be in are four or five rather than twenty.

## Check yourself

Add a test that submits the loan form with a short member name and asserts both the message and that no POST was
sent. Then change a field's `name` attribute and confirm that the `bodyOf` assertion fails while the rendering
assertions still pass.
