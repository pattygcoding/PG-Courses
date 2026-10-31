---
title: Testing hooks and async code
summary: renderHook, deferred promises, and the awaited act that a suspended render needs.
chapter: Testing
minutes: 14
status: draft
---

## renderHook

```ts
import { act, renderHook } from '@testing-library/react';

const { result } = renderHook(() => useLocalStorage('northside.member', ''));

act(() => {
  result.current[1]('Grace Hopper');
});

expect(result.current[0]).toBe('Grace Hopper');
expect(localStorage.getItem('northside.member')).toBe('Grace Hopper');
```

`renderHook` mounts the hook inside a throwaway component, which is what a hook needs: somewhere for its state
slots to live. `result.current` is the latest return value, and `act` wraps the call that changes state so React
flushes it before the assertion.

Reading `result.current` after an `await` gives the value from the render that follows the awaited work, which
is why every async test reads it inside a `waitFor`:

```ts
await waitFor(() => {
  expect(result.current.loading).toBe(false);
});
```

An assertion outside the `waitFor` reads the value from before the promise resolved. I had that failure while
writing these tests: `loading` was false in the poll and `report` was still `null` in the line after it,
because the two reads happened at different moments.

## A promise you control

```ts
export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
}
```

That helper is the whole trick behind testing a loading state. A promise that resolves whenever the test says so
lets the test look at the UI while the request is open:

```ts
const request = deferred<Response>();
vi.stubGlobal('fetch', vi.fn(() => request.promise));

const { result } = renderHook(() => useReport());

expect(result.current.loading).toBe(true);
expect(result.current.report).toBeNull();

request.resolve(new Response(JSON.stringify({ generated: '2026-10-31', genres: [] })));

await waitFor(() => {
  expect(result.current.loading).toBe(false);
});

expect(result.current.report?.generated).toBe('2026-10-31');
```

Without the deferred, the test can only see the state after everything has settled, and the loading state is
never asserted at all.

## Cancellation is testable too

```ts
it('aborts the request when the component goes away', async () => {
  const request = deferred<{ generated: string; genres: [] }>();
  let seen: AbortSignal | undefined;

  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init?: RequestInit) => {
      seen = init?.signal ?? undefined;
      return request.promise;
    }),
  );

  const { unmount } = renderHook(() => useReport());
  unmount();

  expect(seen?.aborted).toBe(true);
});
```

The hook passes the signal it created to `fetch`, and the test grabs the `RequestInit` argument to check it.
That is a test for the cleanup, which is the part of an effect that nobody notices until a page keeps loading
data it no longer shows.

## A suspended render needs an awaited act

The waiting list reads a promise with `use`, so the render suspends. React says what the test has to do, and it
said it loudly while I was writing this suite:

```text
A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React
components that depend on asynchronous data, you must await the result:

await act(() => ...)
```

The fix is to wrap the render itself:

```ts
async function renderWaiting(waiting: Promise<Backlog>, postResponse: Promise<Backlog>) {
  // ...
  vi.stubGlobal('fetch', fetchMock);

  // A component that suspends needs the render awaited inside act, or React
  // never flushes the retry after the promise settles.
  await act(async () => {
    render(
      <ErrorBoundary fallback={<p role="alert">The waiting list is unavailable.</p>}>
        <Suspense fallback={<p>Counting the waiting list...</p>}>
          <WaitingList genre="poetry" waiting={waiting} />
        </Suspense>
      </ErrorBoundary>,
    );
  });

  return fetchMock;
}
```

The symptom without it is a test that times out while the fallback stays on screen: the promise resolved, React
queued a retry, and the queue was never flushed. The same applies to the router helper in this project, which is
why `renderApp` awaits an `act` around its `render` call as well.

One more detail from writing that helper: `act(...).then(...)` returns `undefined` rather than a promise. React's
`act` returns a thenable of its own, so the way to use its result is `await act(...)` inside an async function
rather than chaining a `.then` onto it.

## The debounce, without fake timers

```ts
await user.type(screen.getByLabelText('Search the catalogue'), 'dune');

await vi.waitFor(() => {
  expect(router.state.location.search).toBe('?q=dune');
});
```

The catalogue writes the search term 300 ms after typing stops. `vi.waitFor` polls until the assertion holds,
with a default timeout of a second, which is enough and keeps the test in real time.

`vi.useFakeTimers()` is the alternative, and it is worth it when a test has to control several timers that
interact, such as a retry with a backoff. With `user-event` it needs `userEvent.setup({ advanceTimers })` so the
helper's own delays move with the fake clock, and that pairing is the part people get stuck on.

## Check yourself

Write a test for the `useReport` reload path that asserts the request count after two reloads. Then move one
assertion out of a `waitFor` and watch it fail with a stale value, and put it back.
