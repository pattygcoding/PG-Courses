---
title: Lazy routes and async components
summary: A route that loads when it is visited, the chunks the build writes, and the boundary an awaited component needs.
chapter: Routing
minutes: 14
status: draft
---

## One function in the route table

```ts
{
  path: '/reports',
  name: 'reports',
  component: () => import('../views/ReportsView.vue'),
  meta: { title: 'Reports - Northside Library' },
},
```

A component given as a function is loaded when the route is entered. Vite sees the dynamic `import()` and writes
that module and what only it imports into its own file:

```text
$ npm run build

dist/index.html                                    0.52 kB │ gzip:  0.32 kB
dist/assets/LoanFormView-DBGNbTML.css              0.12 kB │ gzip:  0.12 kB
dist/assets/BookDetailView-DCqnYpBh.css            0.23 kB │ gzip:  0.17 kB
dist/assets/ReportsView-W21aKi-X.css               0.24 kB │ gzip:  0.17 kB
dist/assets/index-DaDb2O8x.css                     2.64 kB │ gzip:  0.99 kB
dist/assets/NotFoundView-pWD7SJZw.js               0.46 kB │ gzip:  0.35 kB
dist/assets/LoanThanksView-c6Y6NR_w.js             0.59 kB │ gzip:  0.42 kB
dist/assets/loans-DcBpceIc.js                      0.63 kB │ gzip:  0.39 kB
dist/assets/ReportsView-Ck6mBkso.js                1.34 kB │ gzip:  0.74 kB
dist/assets/LoanFormView-DZAnBJ09.js               2.81 kB │ gzip:  1.41 kB
dist/assets/BookDetailView-DtBU2KXm.js             3.91 kB │ gzip:  1.75 kB
dist/assets/index-4NPJf2T2.js                     48.53 kB │ gzip: 19.26 kB
dist/assets/runtime-core.esm-bundler-D6CIsE30.js  64.30 kB │ gzip: 24.83 kB
```

Six route chunks and two main files. The split is worth reading properly:

- **`runtime-core.esm-bundler` at 64.30 kB** is Vue itself. It arrives on the first page and cannot be split.
- **`index` at 48.53 kB** is the application: the router, Pinia, the layout, the catalogue and its API module.
- **The route chunks are 0.46 to 3.91 kB each**, and each one is fetched the first time somebody visits that route.
- **The store chunk (0.63 kB) is shared**, because two lazy routes import it. Vite pulls it out rather than
  duplicating it into both.
- **The scoped CSS is split with its component.** `BookDetailView.css` is 0.23 kB and arrives with the page that
  needs it, which is the same idea applied to styles.

`ReportsView-Ck6mBkso.js` is 1.34 kB, and its CSS is 0.24 kB. Both are smaller than the request that fetches them,
which is the honest cost of splitting a small page: two round trips instead of one. The reports page is lazy in this
project because it shows the mechanism and because it is not where anybody starts.

## When not to split

- **The route most people land on.** Splitting the catalogue moves 48 kB out of the first download and into the
  second, which is slower for the visitor who came for it.
- **A component smaller than the request.** A chunk of a kilobyte costs a round trip and a waterfall if it then
  fetches its own data.
- **A feature nobody visits alone.** Two routes that always go together belong in one chunk.

The numbers above are the way to decide: split where the chunk is large and the route is optional, and leave a
two-kilobyte component where it is.

## An async component outside the router

```ts
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
```

```ts
const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChart.vue'),
  delay: 200,
  timeout: 5000,
  loadingComponent: Spinner,
  errorComponent: FailedPanel,
})
```

The function form is the router's form with the same behaviour. The object form adds what a slow or broken chunk
needs: `delay` keeps the spinner from flashing for a chunk that arrives in 50 ms, `timeout` turns a chunk that never
arrives into an error, and the two components say what to show. A chart, a rich text editor, a map and a diff
viewer are the cases worth this; a button is not.

## The boundary an awaited component needs

```ts
const found: Book | Error = await fetchBook(props.id).catch((failure: unknown) =>
  failure instanceof Error ? failure : new Error('The book could not be read.'),
)
```

A top-level `await` in `<script setup>` makes the component asynchronous. Vue renders it when its promise settles,
and only a `<Suspense>` boundary above it can show anything in the meantime:

```vue
<Suspense>
  <template #default>
    <RouterView />
  </template>
  <template #fallback>
    <p role="status">Loading the page...</p>
  </template>
</Suspense>
```

Without that, the route renders nothing while the promise is pending and the console explains why. With it, the
outlet shows a fallback for as long as the chunk or the data is outstanding, which is what this project's shell
does for every route.

Nested boundaries are the next refinement. `BookPanel` awaits the book and renders its own `<Suspense>` around
`WaitingPanel`, so the title and the author appear as soon as the book arrives and the waiting count fills in
behind them:

```vue
<ErrorBoundary>
  <template #fallback>
    <p role="alert">The waiting list is unavailable.</p>
  </template>

  <Suspense>
    <template #default>
      <WaitingPanel :genre="book.genre" />
    </template>
    <template #fallback>
      <p>Counting the waiting list...</p>
    </template>
  </Suspense>
</ErrorBoundary>
```

The outer boundary catches a rejection, the inner one covers a wait, and the part of the page that is ready is on
screen while the part that is not arrives.

## Check yourself

Make the reports route load eagerly, build, and compare the two main chunks with the table above. Then make the book
detail route lazy, add a loading component with a 200 ms delay, and check in the network panel how many requests
the first visit to that route makes before the page is complete.
