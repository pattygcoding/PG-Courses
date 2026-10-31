---
title: Lazy routes and deferred blocks
summary: Two ways to keep code out of the first download, and the build output tells you which one worked.
chapter: Routing
minutes: 14
status: draft
---

## A lazy route is one function

```ts
{
  path: 'books',
  title: 'Catalogue',
  loadComponent: () => import('./library/book-list').then((m) => m.BookList),
},
```

`loadComponent` takes a function that returns a promise of a component class. The import is dynamic, so
the bundler puts that component and everything only it uses into a separate chunk, and the file is
requested on the first navigation to that route.

A route with children loads a whole sub tree:

```ts
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  canMatch: [isAdmin],
},
```

```ts
// src/app/admin/admin.routes.ts
export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminHome },
  { path: 'members', component: MemberList },
];
```

The array is a plain exported value, so a feature's routes can sit together in its own folder, and
`loadChildren` is the entry point the shell knows about.

## The build tells you what happened

```bash
ng build
```

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-XXXXXXXX.js    | main          | 294.73 kB |                82.08 kB
styles-XXXXXXXX.css | styles        |    0 bytes |                 0 bytes

Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-XXXXXXXX.js   | loan-form     |  64.27 kB |                16.20 kB
chunk-XXXXXXXX.js   | book-list     |   2.54 kB |                1.16 kB
chunk-XXXXXXXX.js   | book-detail   |   1.22 kB |                 684 bytes
chunk-XXXXXXXX.js   | shelf-summary |    541 bytes |               541 bytes
```

Three things are worth reading from that table:

- `loan-form` is 64 kB because it is the only route that imports `@angular/forms`. Keeping forms off
  the first page is the largest single saving available in this application.
- `book-list` and `book-detail` are small because they share the framework, which is already in the
  initial chunk.
- A chunk per lazy route also means a request per navigation, so lazy loading a 1 kB component saves
  nothing and adds a round trip.

Route scoped providers are a second, quieter benefit: a service listed in the route's `providers` is
instantiated when the route loads, so a heavy dependency a feature needs is only created if someone
visits it.

## Preloading after the first render

```ts
provideRouter(routes, withPreloading(PreloadAllModules))
```

`PreloadAllModules` downloads every lazy chunk in the background once the application is idle, which
keeps the first paint fast and removes the delay on the next navigation. A custom strategy is a class
with a `preload` method that returns an observable or a promise, which is how you preload only the
routes a signed-in member is likely to visit.

The alternative to preloading is doing nothing and accepting the request on navigation. That is the
right answer for an admin area most members never open.

## Deferred blocks split a page, not a route

```html
@defer (on idle; prefetch on idle) {
  <app-shelf-summary [books]="catalog.all()" />
} @placeholder {
  <p>Shelf summary</p>
} @loading (minimum 200ms) {
  <p role="status">Counting the shelves...</p>
}
```

`@defer` creates a chunk for the components in its block, exactly as `loadComponent` does for a route,
and the trigger decides when that chunk is fetched:

| Trigger | When |
| --- | --- |
| `on idle` | when the browser is idle |
| `on viewport` | when the block scrolls into view |
| `on interaction` | on the first click or key press in the block |
| `on hover` | when a pointer enters |
| `on timer(5s)` | after a delay |
| `when condition` | when an expression becomes true |

`prefetch on idle` fetches the code without rendering it, which is the combination I use when a block
is likely to be shown shortly. `@placeholder` renders until the code arrives, and `@loading (minimum
200ms)` renders while the chunk loads, with the delay preventing a flicker for a block that arrives
instantly.

One warning about the size of the win: in the build table above, `shelf-summary` is 541 bytes and it is
deferred. The chunking is real and the saving is 541 bytes. Deferring a block pays when the block
brings a dependency, such as a charting library or a rich text editor, and it costs a request and a
placeholder for anything small.

## Which one to reach for

| Situation | Tool |
| --- | --- |
| a page nobody has visited yet | `loadComponent` |
| a whole area with its own routes | `loadChildren` with a routes array |
| a heavy widget below the fold | `@defer (on viewport)` |
| something only needed after a click | `@defer (on interaction)` |

A third option is worth remembering for completeness: a deferred block does not render on the server,
so it is also how a client-only widget such as a chart or a map is kept out of the server rendered
output.

## Check yourself

Add a lazy route for a loans list, build, and read the chunk table to see the size it produced. Then
wrap a library-backed widget in `@defer (on viewport)` and watch the network panel to see when its
chunk is requested.
