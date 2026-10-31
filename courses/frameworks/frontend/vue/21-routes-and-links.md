---
title: Routes and links
summary: One route table, the outlet that renders it, and the link class that says where you are.
chapter: Routing
minutes: 13
status: draft
---

## The route table

```ts
import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '../stores/session'

import CatalogueView from '../views/CatalogueView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // Every new page starts at the top, and a back button restores the position.
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
  routes: [
    { path: '/', name: 'catalogue', component: CatalogueView },
    {
      path: '/books/:id',
      name: 'book',
      component: () => import('../views/BookDetailView.vue'),
      // The route parameter arrives as a prop, so the view takes what it needs.
      props: true,
    },
    {
      path: '/loans/new',
      name: 'loan',
      component: () => import('../views/LoanFormView.vue'),
      meta: { requiresMember: true },
    },
    { path: '/loans/thanks', name: 'thanks', component: () => import('../views/LoanThanksView.vue') },
    { path: '/reports', name: 'reports', component: () => import('../views/ReportsView.vue') },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

export default router
```

Every part of that file is doing something specific:

- **`createWebHistory(import.meta.env.BASE_URL)`** uses the History API, so URLs are real paths rather than hashes.
  `BASE_URL` comes from Vite and is `/` unless the application is deployed under a subpath, in which case the router
  has to know. A deployment under `/library/` with `createWebHistory()` and no base is the classic
  works-in-development, blank-in-production bug.
- **A name on every route.** `router.push({ name: 'thanks', query: {...} })` survives a path change; a hard-coded
  `'/loans/thanks'` in twelve files does not.
- **`props: true`** passes route params to the component as props, which is what lets `BookDetailView` declare
  `defineProps<{ id: string }>()` and stay testable without a router.
- **`meta`** carries data for the guards. `requiresMember` is read by the router's own guard.
- **The catch-all last.** `'/:pathMatch(.*)*'` matches anything, so it goes after the routes that should win.
- **`scrollBehavior`** puts a new page at the top, and returns to the saved position for a back button. Without it, a
  client-side navigation keeps the scroll position of the previous page, which reads as a bug.

## The outlet and the links

```vue
<template>
  <header class="shell">
    <RouterLink class="brand" to="/">Northside Library</RouterLink>

    <nav>
      <RouterLink to="/">Catalogue</RouterLink>
      <RouterLink to="/loans/new">New loan</RouterLink>
      <RouterLink to="/reports">Reports</RouterLink>
    </nav>
  </header>

  <main class="shell">
    <!-- Lazy routes and async setup both wait here rather than showing nothing. -->
    <Suspense>
      <template #default>
        <RouterView />
      </template>
      <template #fallback>
        <p role="status">Loading the page...</p>
      </template>
    </Suspense>
  </main>
</template>
```

```ts
nav a.router-link-active {
  font-weight: 700;
}
```

`RouterView` is the hole the current route renders into, and everything around it stays mounted through every
navigation, which is why the header does not flicker. `<Suspense>` around it is what covers a lazy route chunk and a
route component that awaits: without a boundary above them, the outlet renders nothing while the code or the data
arrives.

`RouterLink` renders an `<a>` with a real `href`, so a link is still a link: middle click, copy the address, open in
a new tab. It also adds two classes the current route decides:

| Class | Added when |
| --- | --- |
| `router-link-active` | the route matches, including a nested path |
| `router-link-exact-active` | the route matches exactly |

The scaffold's `App.vue` styles the second, and the catalogue styles the first, so `/` is not highlighted while
`/books/dune` is open. `RouterLink` also sets `aria-current="page"` on the active link, which is what a screen reader
announces; the accessibility page comes back to it.

```vue
<RouterLink :to="{ name: 'book', params: { id: book.id } }">{{ book.title }}</RouterLink>
```

An object target with `params` is the readable way to build a URL. The string form `` :to="`/books/${book.id}`" ``
works and skips the route name, so a renamed path breaks it silently.

## Redirects

```ts
{ path: '/', name: 'catalogue', component: CatalogueView },
```

```ts
{ path: '/catalogue', redirect: { name: 'catalogue' } },
```

```ts
router.beforeEach((to) => {
  if (to.meta.requiresMember === true && useSessionStore().member === null) {
    return { name: 'catalogue', query: { next: to.fullPath } }
  }

  return true
})
```

A `redirect` in the table is a rule that never changes. A guard is the place for a rule that depends on state, which
the fourth page in this chapter takes apart.

## The page's own view of itself

```ts
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

route.params.id // the current params
route.query // the query string
route.name // 'book'
route.fullPath // '/books/dune?highlighted=1'
```

`useRoute` is a reactive object describing where the application is, and a template or a computed that reads it
updates on navigation. `useRouter` is the instance used to go somewhere: `push`, `replace`, `back` and `resolve`.

## Check yourself

Add an `/about` route with a lazy component, a link to it in the navigation, and a redirect from `/info`. Then check
which of the two link classes is on the Catalogue link while `/books/dune` is open, and explain the difference with
`router-link-exact-active`.
