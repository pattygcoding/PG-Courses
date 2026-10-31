---
title: Suspense and error boundaries
summary: What to show while a promise is pending, and the class component that catches a render that threw.
chapter: Effects and data
minutes: 14
status: draft
---

## Suspense is a placeholder with rules

```tsx
<ErrorBoundary fallback={<p role="alert">The waiting list is unavailable.</p>}>
  <Suspense fallback={<p>Counting the waiting list...</p>}>
    <WaitingList genre={book.genre} waiting={waiting} />
  </Suspense>
</ErrorBoundary>
```

`Suspense` renders its fallback when a child suspends: a lazy component whose code has not arrived, or a
component reading a promise that has not settled. When the child is ready, React renders it into the same
place. Nothing else in the tree is unmounted, so the heading, the author and the link around that block stay
exactly as they were.

Two rules make it behave the way you want:

- **Put the boundary close to the slow part.** A boundary at the top of the page replaces the whole page with
  its fallback, which is the flash of a spinner that applications get blamed for. A boundary around the
  waiting list replaces three words.
- **A fallback must be the same size as the content, or it is a layout shift.** A one line fallback in a place
  that renders five lines moves everything below it when the content arrives. That is a measurable problem
  rather than a cosmetic one, and the fix is a skeleton with roughly the right height.

Suspense also has a second job in navigation: wrapping a route transition in `startTransition` keeps the
current page on screen while the next one loads, rather than showing its fallback. The router's pending
indicator covers the same ground for loaders, which the routing chapter comes to.

## Error boundaries are still class components

```tsx
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback: ReactNode;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

/**
 * Catches an error thrown while a child renders, including one a Suspense
 * boundary let through, and renders something else in its place.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('A component threw while rendering', error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
```

React 19 has no hook for this, and the reason is structural: `getDerivedStateFromError` and
`componentDidCatch` are the two places React hands over a render that threw, and they exist on the class
component lifecycle. A boundary is one of the few components in a modern codebase that is not a function, and
that is the accepted exception.

What the class does, in order: a child throws during rendering, React walks up to the nearest boundary and
calls `getDerivedStateFromError` (a static function, so it only returns the new state), then re-renders the
boundary, which now returns the fallback. `componentDidCatch` runs afterwards for the log.

## What a boundary catches, and what it does not

| Caught | Not caught |
| --- | --- |
| an error thrown while rendering | an error in an event handler |
| an error in a lifecycle method | an error in a `setTimeout` callback |
| a rejected promise read with `use` | a rejected promise in an effect's `.catch` |
| an error during hydration (in some cases) | an error in the code that calls `createRoot` |

An event handler's error is a separate problem, and the answer there is a `try`/`catch` and a state entry that
renders a message. An effect's rejection is the same: the effect sees it and decides what to show. A boundary
is for the case that has no place to put a `catch`, which is a component that throws while producing its
output.

I verified the boundary and the promise case together, with a test that hands a rejected promise to a
component reading it:

```ts
it('hands a rejected promise to the error boundary', async () => {
  const failed: Promise<Backlog> = Promise.reject(new Error('the waiting list is down'));
  failed.catch(() => undefined);

  await act(async () => {
    render(
      <ErrorBoundary fallback={<p role="alert">The waiting list is unavailable.</p>}>
        <Suspense fallback={<p>Counting the waiting list...</p>}>
          <WaitingList genre="poetry" waiting={failed} />
        </Suspense>
      </ErrorBoundary>,
    );
  });

  expect(await screen.findByText('The waiting list is unavailable.')).toBeInTheDocument();
});
```

The `failed.catch(() => undefined)` line is there for the test runner rather than for React: a rejected
promise with no handler at all is reported as an unhandled rejection before React gets to look at it.

## Where to put them

- One boundary around each panel that can fail on its own, so a broken waiting list does not take the book
  page with it.
- One around the routed area, which the router provides as `errorElement` and which the routing chapter
  covers.
- One at the top, if the application has anything outside the router that can throw.

A boundary that wraps everything and renders "Something went wrong" turns every failure into the same page,
and the person cannot tell whether the problem was their search, their session or the API. Three smaller
boundaries cost ten lines and keep the rest of the page useful.

## Check yourself

Add a component that throws when a book is missing its title, wrap it in a boundary, and confirm which
elements of the page survive. Then throw from an event handler inside the same component and work out why the
boundary did not react.
