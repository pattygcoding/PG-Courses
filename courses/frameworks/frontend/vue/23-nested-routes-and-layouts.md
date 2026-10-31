---
title: Nested routes and layouts
summary: A parent route that renders a shell, the outlet inside it, and the scroll behaviour that goes with navigation.
chapter: Routing
minutes: 13
status: draft
---

## Nesting

```ts
{
  path: '/loans',
  component: LoansLayout,
  children: [
    { path: 'new', name: 'loan', component: () => import('../views/LoanFormView.vue') },
    { path: 'thanks', name: 'thanks', component: () => import('../views/LoanThanksView.vue') },
  ],
},
```

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <section class="loans">
    <h1>Loans</h1>
    <nav>
      <RouterLink to="/loans/new">New loan</RouterLink>
      <RouterLink to="/loans/thanks">Last receipt</RouterLink>
    </nav>

    <RouterView />
  </section>
</template>
```

A parent route with `children` renders its own component and the matched child renders where that component puts a
`<RouterView>`. The child path is written relative to the parent, so `'new'` under `'/loans'` is `/loans/new`.

The catalogue's own route table is flat, with the header and the outlet in `App.vue`, because it has one section and
no shared chrome per section. Nesting earns its place when a section has its own navigation, its own heading or its
own guard: the layout renders once, and switching between the children replaces only the inner outlet.

## The layout is a component

```vue
<template>
  <header class="shell">
    <!-- the navigation and the session -->
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

That is the shell in `App.vue`, and it is a layout in all but name: it stays mounted, the outlet changes underneath,
and the `<Suspense>` boundary covers the two things that can leave the outlet empty, which are a lazy route chunk
still arriving and a route component that awaits its data.

Without that boundary, a route whose component awaits renders nothing at all while the promise is pending. Vue
warns about the missing boundary rather than a blank page, and the warning is one of the two things to check when a
route appears to do nothing:

```text
<Suspense> is an experimental feature and its API will likely change.
```

That line comes out of this project's test run every time an async route component renders. Suspense is labelled
experimental and is used by every framework built on Vue, so it is safe to rely on and worth knowing that the label
exists.

## An index child

```ts
{
  path: '/loans',
  component: LoansLayout,
  children: [
    { path: '', name: 'loans', component: () => import('../views/LoanIndexView.vue') },
    { path: 'new', name: 'loan', component: () => import('../views/LoanFormView.vue') },
  ],
},
```

A child with an empty path is the one that renders for the parent's own URL. It is how `/loans` gets a page of its
own without a second route record.

## Named views

```vue
<RouterView />
<RouterView name="sidebar" />
```

```ts
{
  path: '/books/:id',
  components: {
    default: () => import('../views/BookDetailView.vue'),
    sidebar: () => import('../views/BookSidebar.vue'),
  },
},
```

`components` instead of `component` fills several outlets from one route. It is worth knowing for a layout with a
persistent panel beside the page, and it is a rare choice: two outlets usually mean two layouts, and a nested route
reads better.

## Scroll behaviour

```ts
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // Every new page starts at the top, and a back button restores the position.
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
  routes: [ /* ... */ ],
})
```

Without that function, a client-side navigation keeps the scroll position of the previous page, which reads as a
bug on a long list: click a book at the bottom and the new page opens at the bottom. The three return shapes are all
used in practice:

| Returned | Effect |
| --- | --- |
| `{ top: 0 }` | the top of the page |
| `savedPosition` | where the back button left it |
| `{ el: '#errors', behavior: 'smooth' }` | a particular element, with an animated scroll |

A delayed return works too, which is what to reach for when a page renders its content after the navigation:
`scrollBehavior` can return a promise that resolves to one of those objects.

## What nesting costs

Every level of nesting is one more file to know about, one more `<RouterView>`, and one more place a route can be
forgotten. The rule I use: nest when a section has chrome of its own, stay flat when it does not, and give the
shared chrome to the application shell in `App.vue`. The catalogue has one flat table and one layout in `App.vue`,
which for eleven routes is the right shape.

## Check yourself

Add a `/loans` layout with its own heading and two links, move the two loan routes under it, and check that
navigating between them keeps the layout mounted. Then add a child with an empty path and confirm it renders for
the parent's URL with no second route record.
