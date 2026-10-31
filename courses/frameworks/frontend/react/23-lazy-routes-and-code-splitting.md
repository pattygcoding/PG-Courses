---
title: Lazy routes and code splitting
summary: A route that loads when it is visited, the chunk it produces, and when splitting costs more than it saves.
chapter: Routing
minutes: 13
status: draft
---

## One line in the route table

```ts
{
  path: 'reports',
  lazy: () => import('./reports/Reports'),
},
```

```tsx
/** The route lazily loads this module, and the router reads `Component` from it. */
export function Component() {
  const { report, error, loading, reload } = useReport();
  // ...
}
```

`lazy` takes a function that returns a promise of a module, and the router looks for the route properties in
what it resolves: `Component`, `ErrorBoundary`, `loader`, `action`, `HydrateFallback`. The export has to be
named `Component` rather than `default`, which is the one detail people get wrong.

Vite sees a dynamic `import()` and puts that module and everything only it imports into a separate file, which
the browser requests on the first navigation to the route:

```text
$ npm run build

dist/index.html                    0.46 kB │ gzip:   0.30 kB
dist/assets/index-KvZSNVjN.css     0.77 kB │ gzip:   0.41 kB
dist/assets/Reports-B2zP5pvk.js    2.36 kB │ gzip:   1.02 kB
dist/assets/index-BxJgBDjW.js    337.24 kB │ gzip: 106.72 kB
```

The reports page is the small file. The framework, the router and the rest of the application are the large
one, and they arrive on the first page either way.

`loadChildren` is the other form, and it takes a module exporting a route array:

```ts
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then((module) => module.ADMIN_ROUTES),
},
```

Use it when a feature has several routes of its own. One module with one component is a `lazy` route.

## Lazy components outside the router

```tsx
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));

<Suspense fallback={<p>Loading the chart...</p>}>
  <HeavyChart points={points} />
</Suspense>
```

`lazy` needs a module with a default export. For a named export, adapt it:

```tsx
const HeavyChart = lazy(() => import('./archive').then((module) => ({ default: module.HeavyChart })));
```

This is the same mechanism as a lazy route without the router: a dynamic import, a `Suspense` boundary for the
wait, and a chunk in the build output. It is the right tool for a component that is genuinely heavy and not
needed at first, such as a chart, a rich text editor, a map or a diff viewer.

## When splitting is a loss

Three cases where a lazy route costs more than it saves:

- The component is small. The chunk for the reports page is 2.36 kB uncompressed and 1.02 kB over the wire,
  which is smaller than the request that fetches it. The saving is a rounding error and the cost is a round
  trip.
- The route is where most people start. Splitting the catalogue would move 20 kB out of the first download and
  into the second, which is slower for anybody who lands on it.
- The route is likely to be visited. A route that follows the previous one in every session is worth
  prefetching rather than deferring.

The honest way to decide is the build output above: split where the chunk is large, and leave two-kilobyte
components where they are. A route with a heavy dependency is the case that pays, and the reports page is only
in this course because it shows the mechanism.

## The waterfall, and how to avoid it

```tsx
{
  path: 'reports',
  lazy: () => import('./reports/Reports'),
},
```

The lazy route's code is fetched when the navigation starts, and anything *it* imports lazily is fetched after
that. Two levels of that is a waterfall: one round trip, then another, then the data request. Three ways out:

- One lazy boundary per feature rather than per component, so the feature arrives in one request.
- A loader on the lazy route, which the router starts as soon as the module is available.
- Prefetching on hover or on idle, which the framework's own link prefetching does for you when the mode
  supports it.

## What the browser does with the chunks

```html
<link rel="modulepreload" href="/assets/index-BxJgBDjW.js" />
<script src="/assets/index-BxJgBDjW.js" type="module"></script>
```

Vite adds a preload hint for the chunks a page already knows it needs, and the browser fetches them in
parallel with the entry. A chunk behind a dynamic import is deliberately absent from that list, because
fetching it eagerly would defeat the split.

## Check yourself

Add a second lazy route for a book archive and read the chunk table after a build. Then import a component
lazily inside the reports page as well, build again, and look at how many requests the network panel shows
before the page is complete.
