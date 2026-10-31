---
title: Server rendering and hydration
summary: The same components rendered to HTML, the data handed to the browser, and a hydration with no console warnings.
chapter: Shipping
minutes: 15
status: draft
---

## Two entry points

```text
src/entry-server.tsx   renders the page to HTML
src/entry-client.tsx   adopts the HTML the server sent
server.mjs             a server that does both
```

React renders components in the browser, in a test, and on a server, because the component model has nothing to
do with the DOM. `react-dom/server` produces HTML from the same tree, and `hydrateRoot` attaches React to that
HTML in the browser instead of replacing it.

## Rendering to a stream

```tsx
import { renderToReadableStream } from 'react-dom/server';
import { ShelfPage } from './ssr/ShelfPage';

/** Renders the page to HTML, waiting for the suspended part to arrive. */
export async function render(url: string): Promise<string> {
  const stream = await renderToReadableStream(
    <>
      <ShelfPage report={Promise.resolve(REPORT)} />
      <script
        id="transfer-state"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(REPORT).replaceAll('<', '\\u003c') }}
      />
    </>,
    {
      onError(error: unknown) {
        console.error('The server could not render', url, error);
      },
    },
  );

  // Waiting for allReady means the Suspense fallback is replaced by the content
  // before the response is sent. Removing the await streams the fallback first.
  await stream.allReady;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = '';

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      return html;
    }

    html += decoder.decode(value);
  }
}
```

Four decisions in that function:

- **`renderToReadableStream` rather than `renderToString`.** The streaming API supports Suspense properly, and it
  lets a page start arriving before the slow part is ready.
- **`await stream.allReady`** waits for the suspended part, which is what a page like this wants: a report that
  arrives complete. Leaving the await out streams the fallback first, and the rest of the HTML follows when the
  promise settles. Both are legitimate; the difference is whether the first paint contains the numbers.
- **The data is serialised into a script tag.** The server already built the report, and the browser should not
  fetch it again. That is the idea behind a transfer state cache, written out by hand here.
- **`onError` logs and does not throw.** A failure during rendering has to leave a response that the client can
  hydrate and repair.

## The HTML that comes back

```html
<div id="root">
  <section>
    <h1>Loans by genre</h1>
    <p>Counted on 2026-10-31</p>
    <ul>
      <li>Science fiction: 42 loans, 3 waiting</li>
      <li>Non fiction: 17 loans, 1 waiting</li>
      <li>Poetry: 5 loans, 0 waiting</li>
    </ul>
  </section>
  <script id="transfer-state" type="application/json">
    {"generated":"2026-10-31","genres":[...]}
  </script>
</div>
```

That is the response from the server in this project, fetched with `curl` before any JavaScript ran. The list is
in the document, so the first paint has the numbers in it, and the fallback was replaced before the response was
sent because of `allReady`.

React marks what it rendered so the client can match it up. The markers are comments in the HTML, and they are
why a hydration mismatch can name the element it failed on:

```html
<!--$--><!--/$-->
```

## Hydrating

```tsx
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import type { Report } from './library/book';
import { ShelfPage } from './ssr/ShelfPage';

const state = document.getElementById('transfer-state');
const report: Report =
  state === null
    ? { generated: 'unknown', genres: [] }
    : (JSON.parse(state.textContent ?? '{}') as Report);

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <ShelfPage report={Promise.resolve(report)} />
  </StrictMode>,
);
```

`hydrateRoot` walks the existing DOM and attaches handlers and state to it rather than building the tree again.
The client reads the data out of the transfer state, so the two renders agree and no second request goes out for
the same report.

A mismatch is reported rather than repaired silently:

```text
Hydration failed because the server rendered text didn't match the client.
```

The usual causes are a value that differs between the two runs, such as `Date.now()`, `Math.random()` or a
locale-dependent format, and reading `window` on the server, where it does not exist. `useId` exists for the
first of those: it produces an id that matches on both sides, which is what an input and its label need.

I checked this project's render in a browser afterwards, and the console reported no errors and no warnings,
which is the only way to know that hydration matched rather than merely worked.

## What breaks without a browser

- `window`, `document` and `localStorage` do not exist on the server. Reading them belongs inside an effect or a
  handler, both of which run in the browser only.
- Effects do not run during server rendering, so a request started in an effect happens twice: once for the
  server render and once in the browser. The first is wasted unless the data is passed down instead.
- A component that reads a value which changes every second renders differently on the two sides, which is the
  mismatch above.
- `useLayoutEffect` warns during server rendering, because there is no layout to measure. `useEffect` is the one
  that works in both places.

## The server itself

```js
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

const server = createServer((request, response) => {
  vite.middlewares(request, response, () => {
    renderPage(request.url ?? '/')
      .then((page) => {
        response.setHeader('Content-Type', 'text/html');
        response.end(page);
      })
      .catch((error) => {
        vite.ssrFixStacktrace(error);
        response.statusCode = 500;
        response.end(String(error));
      });
  });
});
```

Twelve lines of Node with Vite in middleware mode: Vite transforms the client entry, this handler transforms and
renders the server entry, and one process serves both. A production build swaps the middleware for static files,
which the next page covers.

What I would not do in a real application is write this by hand for every route. A framework that handles routing,
data loading, streaming and the transfer state together is the answer, and React has two official ones: React
Router's framework mode, and Next.js, which the fullstack course covers. The point of this page is knowing what
the framework does on your behalf.

## Check yourself

Remove `await stream.allReady`, fetch the page with `curl`, and find the fallback in the HTML. Then put it back,
add a component that renders `Date.now()`, and read the hydration warning React gives you in the browser console.
