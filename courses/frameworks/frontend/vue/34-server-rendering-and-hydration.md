---
title: Server rendering and hydration
summary: renderToString, the two entry points, the data handed to the browser, and a hydration with no warnings.
chapter: Shipping
minutes: 15
status: draft
---

## Two entry points

```text
ssr/ShelfPage.vue      the page both sides render
ssr/entry-server.ts    renders it to HTML
ssr/entry-client.ts    adopts the HTML the server sent
ssr/server.mjs         a server that does both
```

Vue renders components in the browser, in a test and on a server, because the component model has nothing to do with
the DOM. `renderToString` from `vue/server-renderer` produces HTML from the same tree, and `createSSRApp` in the
browser adopts that HTML instead of replacing it.

## Rendering to a string

```ts
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import ShelfPage from './ShelfPage.vue'
import type { Report } from '../src/library/book'

/** Stands in for the report the API would return. */
const REPORT: Report = {
  generated: '2026-10-31',
  genres: [
    { genre: 'science-fiction', loans: 42, waiting: 3 },
    { genre: 'non-fiction', loans: 17, waiting: 1 },
    { genre: 'poetry', loans: 5, waiting: 0 },
  ],
}

export async function render(): Promise<{ html: string; state: Report }> {
  const app = createSSRApp(ShelfPage, { report: REPORT })

  const html = await renderToString(app)

  return { html, state: REPORT }
}
```

Four decisions in that function:

- **`createSSRApp` rather than `createApp`.** On the server the two are the same object, and on the client
  `createSSRApp` is what tells Vue to hydrate rather than render from scratch. One call used on both sides is easier to
  keep honest.
- **The props carry the data.** `ShelfPage` takes a `report` and does not fetch, so the server and the browser render
  the same output from the same value. A component that fetches cannot do that without a transfer state cache.
- **The state goes back with the HTML.** The second return value is serialised into the document, which is the idea
  behind a transfer state cache, written out by hand.
- **`renderToString` waits for async components.** A `<Suspense>` boundary inside the tree is resolved before the string
  is returned, which is what makes `renderToString` usable for a page with a top-level await.

A stream is the other API, and it is the one a framework uses: the shell goes first and the suspended parts follow as
they resolve, so the first byte arrives before the data does. The string version is simpler, and this page uses it
because the difference is invisible until a page has a slow boundary in it.

## The HTML that comes back

```html
<div id="app">
  <section data-v-c3b10b9f>
    <h1 data-v-c3b10b9f>Loans by genre</h1>
    <p data-v-c3b10b9f>Counted on 2026-10-31</p>
    <table data-v-c3b10b9f>
      <caption data-v-c3b10b9f>Loans recorded and borrowers waiting</caption>
      <tbody data-v-c3b10b9f>
        <tr data-v-c3b10b9f><th scope="row" data-v-c3b10b9f>Science fiction</th><td data-v-c3b10b9f>42</td></tr>
      </tbody>
    </table>
  </section>
  <script id="transfer-state" type="application/json">{ "generated": "2026-10-31" }</script>
</div>
```

That is the response from the server in this project, fetched with `curl` before any JavaScript ran. Two details:

- **The table is in the document**, so the first paint has the numbers in it rather than a skeleton and a request.
- **`data-v-c3b10b9f` is scoped CSS.** The compiler hashes a component's styles and puts the attribute on its elements
  and the matching selector in the CSS file, so a rule in one component cannot reach another. The hash travels in the
  HTML, which is why the server render and the client render have to come from the same build.

In development the plugin also writes an inspector attribute, `data-v-inspector="ssr/ShelfPage.vue:11:3"`, which is what
lets a click in the devtools open the right line. A production build drops it.

## Hydrating

```ts
import { createSSRApp } from 'vue'
import ShelfPage from './ShelfPage.vue'
import type { Report } from '../src/library/book'

// The server rendered this file's data into the document, so the browser starts
// from the same value rather than asking for it again.
const state = document.getElementById('transfer-state')
const report: Report =
  state === null
    ? { generated: 'unknown', genres: [] }
    : (JSON.parse(state.textContent ?? '{}') as Report)

// createSSRApp adopts the HTML that is already there; createApp would replace it.
createSSRApp(ShelfPage, { report }).mount('#app')
```

The client entry reads the same data out of the document and mounts with it, so the two renders agree and no second
request goes out for the report.

Two failure modes, and both are reported rather than repaired:

```text
[Vue warn]: Hydration node mismatch: - Client vnode: div - Server vnode: section
[Vue warn]: Hydration text mismatch in ... - Server: "0" - Client: "1"
```

The causes are the usual ones: a value that differs between the two runs, such as `Date.now()`, `Math.random()` or a
locale-dependent format; a `v-if` that depends on something only the browser knows, such as `window.innerWidth`; and
`typeof window !== 'undefined'` branching that produces different markup on the two sides.

I checked this project's render in a browser afterwards, and the console reported no errors and no warnings, which is
the only way to know that hydration matched rather than merely worked.

## What breaks without a browser

- **`window`, `document` and `localStorage`** do not exist. Reading them belongs inside `onMounted` or an event
  handler, both of which run in the browser only.
- **`onMounted` does not run on the server**, so a request started there happens twice: once for the server render and
  once in the browser. Passing the data down as a prop is what avoids the second one.
- **A timestamp or a random value renders differently on the two sides**, which is the mismatch above.
- **A third-party component that touches the DOM in setup** cannot be server rendered. It goes behind a conditional
  that only the browser satisfies, or behind `defineAsyncComponent`.

## The server

```js
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom',
})

async function renderPage(url) {
  const html = await vite.transformIndexHtml(url, template)
  const { render } = await vite.ssrLoadModule('/ssr/entry-server.ts')
  const { html: app, state } = await render()

  return html
    .replace('<!--app-html-->', app)
    .replace('<!--app-state-->', JSON.stringify(state).replaceAll('<', '\\u003c'))
}

const server = createServer((request, response) => {
  vite.middlewares(request, response, () => {
    renderPage(request.url ?? '/')
      .then((page) => {
        response.setHeader('Content-Type', 'text/html')
        response.end(page)
      })
      .catch((error) => {
        vite.ssrFixStacktrace(error)
        response.statusCode = 500
        response.end(String(error))
      })
  })
})
```

Fifteen lines of Node with Vite in middleware mode: Vite transforms the client entry, this handler transforms and
renders the server entry, and one process serves both. The `replaceAll('<', '\\u003c')` is not decoration: JSON
containing `</script>` ends the script element early, and escaping the angle brackets stops a value from closing the
tag it is in.

What I would not do in a real application is write this by hand for every route. Nuxt is the framework that puts
routing, data loading, streaming and the transfer state together, and it is the counterpart of Next.js for React. The
point of this page is knowing what it does on your behalf, and being able to render one page without it.

## Check yourself

Add a component to the server page that renders `Date.now()`, fetch the page with `curl`, and compare the HTML with
what the browser shows after hydration. Then remove the timestamp and confirm the hydration warning goes away.
