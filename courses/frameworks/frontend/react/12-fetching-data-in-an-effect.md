---
title: Fetching data in an effect
summary: Loading, error and data, plus the two things an effect has to get right, which are cancelling and ordering.
chapter: Effects and data
minutes: 15
status: draft
---

## The hook this project uses

```ts
import { useCallback, useEffect, useState } from 'react';
import { fetchReport } from '../library/api';
import type { Report } from '../library/book';

interface ReportState {
  readonly report: Report | null;
  readonly error: string | null;
  readonly loading: boolean;
}

const EMPTY: ReportState = { report: null, error: null, loading: true };

/** Reads the loan report, cancelling the request when the page goes away. */
export function useReport() {
  const [state, setState] = useState<ReportState>(EMPTY);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchReport(controller.signal)
      .then((report) => {
        if (active) {
          setState({ report, error: null, loading: false });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'The report could not be read.',
        }));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, reload };
}
```

Five decisions in forty lines, and each one answers a real failure:

- **One state object** rather than three `useState` calls, so a response cannot land with `loading` false and
  `error` set to the message from the request before last.
- **`new AbortController()` inside the effect**, so the request belongs to the effect that started it. The
  cleanup aborts it, and the browser cancels the fetch rather than leaving bytes in flight for a page that has
  gone.
- **The `active` flag** covers what the abort does not: a response that already arrived and queued a `.then`
  callback. Without it, a slow first request can set state after a fast second one and the page shows the
  older answer.
- **The loading flag in `reload`** rather than in the effect. That is the linter's complaint answered: an
  effect that sets state synchronously on every run causes a second render for nothing, and the place where
  the value changes is the handler the person used.
- **`attempt` in the dependency array** as the reload trigger. Incrementing a number is a smaller thing to get
  wrong than a subscription or a ref, and the effect re-runs because the array changed, which is the mechanism
  an effect is documented to have.

## Ordering, and why the flag is not paranoia

Two requests are easy to produce: click reload twice quickly, or type in a search box that fires one per
keystroke. Requests complete in whatever order the network decides, so the code has to know which answer is
the current one. Three guards, from cheapest to most thorough:

```ts
// the last request wins, and the earlier callbacks are dropped
let active = true;

// the request is cancelled, so the server sees the disconnect
const controller = new AbortController();

// the answer is trusted only if it is the one being waited for
if (id === latestId.current) setState(next);
```

`AbortController` is not the whole story. `AbortSignal.timeout(5_000)` is worth adding when the API can hang,
and combining a timeout signal with a cancellation signal needs `AbortSignal.any([a, b])`, which is available
in current browsers rather than in every browser you may support.

## What the response should look like

```ts
export async function fetchReport(signal?: AbortSignal): Promise<Report> {
  const response = await fetch(`${base}/reports.json`, { signal });

  if (!response.ok) {
    throw new Error(`The report could not be read (status ${response.status}).`);
  }

  return (await response.json()) as Report;
}
```

Two things `fetch` will not do for you:

- It resolves for a 404 and a 500. Only `response.ok` tells those apart from a success, which is why every
  reader in this project checks it.
- `response.json()` is typed `any`, so the `as Report` is a promise rather than a check. For a response that
  might be the wrong shape, a schema library such as Zod turns that promise into a check, and the value it
  returns is typed from the schema.

## Rendering the three states

```tsx
export function Component() {
  const { report, error, loading, reload } = useReport();

  if (loading) {
    return <p role="status">Loading the report...</p>;
  }

  if (error !== null) {
    return (
      <p role="alert">
        {error}{' '}
        <button type="button" onClick={reload}>
          Try again
        </button>
      </p>
    );
  }

  return <p>Counted on {report?.generated}</p>;
}
```

An early return per state keeps the loaded case free of `?.` chains and of conditions, and it puts the states
in the order a person meets them. `role="status"` and `role="alert"` are what a screen reader announces,
which the accessibility page takes apart.

## When an effect is the wrong place for a request

The pattern above is correct, and it is not the one this course uses for the catalogue. Two things make an
effect a second choice:

- The request starts after the first render, so the page shows an empty frame that could have been filled on
  the server or before the route rendered. A loader runs before the page appears, and there is no loading
  state for it to render.
- Every page invents the same four values: data, error, loading and a way to refetch. A library such as
  TanStack Query or SWR replaces the hook, adds caching and revalidation, and removes the chance of getting
  the ordering guard wrong.

The rules I follow: a route that cannot be useful before its data arrives gets a loader, a request the
component owns and re-runs on a filter gets a hook like this one, and a request that wants caching gets a
library.

## Check yourself

Point `fetchReport` at an endpoint that answers after two seconds and one that answers immediately, click
reload twice in a row, and watch which answer wins. Then remove the `active` flag and repeat, and explain what
the page shows and why.
