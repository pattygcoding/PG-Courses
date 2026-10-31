---
title: Measuring renders
summary: A counter in the component, the profiler in the browser, and why development numbers look doubled.
chapter: Performance
minutes: 13
status: draft
---

## A probe, kept honest

```ts
let renders = 0;

/**
 * Counts how often a component body runs. A measurement aid: it is here so the
 * React Compiler page can show a number rather than a claim, and it comes out
 * again afterwards.
 */
export function countRender(): void {
  renders += 1;
}

export function renderCount(): number {
  return renders;
}
```

```tsx
export function ShelfSummary({ books }: ShelfSummaryProps) {
  countRender();
  // ...
}
```

Writing to a module variable while rendering is exactly what the rules forbid, which is why this file is
labelled as a measurement and deleted once it has answered the question. It is the cheapest way to get a
number, and a number is worth more than an opinion about which component re-renders too often.

Three ways to display it, in order of how much setup they need:

| Where the number goes | How it gets there |
| --- | --- |
| a `<span>` in the component | visible in the page and in a test |
| `console.log` in the body | visible in the browser console, noisy |
| a global function on `window` | readable from the console or from a browser automation tool |

For the compiler measurement earlier in this chapter I read the count out of the page with a browser
automation call, which is what makes the two tables in that page measurements rather than estimates.

## StrictMode doubles everything in development

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  </StrictMode>,
);
```

In development, `StrictMode` renders each component twice and runs each effect twice:

```text
setup -> cleanup -> setup
```

The counter in this project read 4 after the first paint, which is two renders of the component times two for
a second pass caused by the deferred value in the search list. A number that looks like double what you expect
is usually this, and the check is a production build:

```bash
npm run build && npm run preview
```

The same interaction in a preview build produces a smaller, unsmoothed number, because the double render is
development only. Effects behave the same way: two requests in the network panel during a single page load are
the rehearsal, and they are a feature rather than a leak.

## The profiler in React DevTools

The extension records a session and shows a flame graph of every component that rendered, how long each took,
and why it rendered. The reasons are the useful part:

```text
ShelfSummary rendered because:
  - props changed
  - state changed
  - the parent re-rendered
  - context changed
```

"Parent re-rendered" is the one to look for when a component's props did not change, because it is either the
case the compiler handles for you or a sign that state lives too high. "Context changed" is the one to look for
in an application with a provider high in the tree.

The profiler has a second mode that highlights components as they render, which is the fastest way to see a
list where every row re-renders on a keystroke somewhere else on the page.

## The browser's own tools

```text
Performance panel -> record -> type in the search box -> stop
```

The main thread track shows React's work as script time. Two things to look for:

- Long tasks inside a keystroke. Anything above 50 ms is a keystroke the person will notice.
- Layout after a scroll or a resize, caused by an element whose size changes with the content. That is the
  layout shift a fallback with the wrong height creates.

The Performance panel answers "is this slow" and the DevTools profiler answers "which component is doing it".
Between them they cover almost everything a render counter can tell you, with the counter staying useful for
the case where neither can run: a test, or a headless browser.

## What to measure first

The order I work in, because each step is cheaper than the next:

1. The build output, for what the browser has to download.
2. The Performance panel on a throttled CPU, for a long task.
3. The profiler, for which component re-renders.
4. A render counter, for a number that goes in a test or a report.

Optimising before step 2 is guessing, and the guess is usually wrong: a component that looks expensive because
it is long is often cheap, and a one-line component inside a list of a thousand rows is not.

## Check yourself

Add the render counter to the catalogue's list rows, type a search term, and write down how many rows re-render
for four keystrokes. Then open the profiler, find the render that took the longest, and write down why React
says it happened.
