---
title: Navigation guards
summary: One place to decide whether a route may open, one place to run afterwards, and the message a missing store throws.
chapter: Routing
minutes: 13
status: draft
---

## A guard that depends on state

```ts
router.beforeEach((to) => {
  // The store is read inside the guard rather than at module scope, because
  // Pinia is not installed until the application is created.
  const session = useSessionStore()

  if (to.meta.requiresMember === true && session.member === null) {
    return { name: 'catalogue', query: { next: to.fullPath } }
  }

  return true
})
```

`beforeEach` runs before every navigation. Returning:

- `true` or `undefined` lets the navigation continue.
- `false` cancels it and the browser stays where it is.
- a location, such as the object above, redirects. Here a signed out visitor lands on the catalogue with the page
  they wanted in `next`, so a sign-in screen could send them back.

That is the whole of the guard, and it runs because the route record says so:

```ts
meta: { requiresMember: true, title: 'New loan - Northside Library' },
```

`meta` is a bag the developer puts things in and the router carries along. Nothing in Vue reads it: the guard reads
`requiresMember` and the after hook reads `title`, and both are conventions this project keeps in one file.

## What a signed out visitor sees

```text
Page URL: http://localhost:4290/?next=/loans/new
```

That is the address bar after opening `/loans/new` while signed out, which is the redirect above doing its work.
The `next` parameter is the useful part: a guard that only sends somebody to the front page loses what they asked
for, and the second version of this application sends them back after a sign-in with `router.push(route.query.next)`.

## Running after a navigation

```ts
router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Northside Library'
  document.title = title
})
```

```ts
meta: { title: 'Reports - Northside Library' },
```

`afterEach` cannot redirect and cannot cancel; it runs once a navigation has completed, which makes it the place for
the things that depend on where you ended up rather than on whether you may go. Setting the document title is the
classic one, and it is a test rather than a promise:

```ts
it('sets the title from the route metadata', async () => {
  await router.push({ name: 'catalogue' })
  expect(document.title).toBe('Catalogue - Northside Library')

  await router.push({ name: 'reports' })
  expect(document.title).toBe('Reports - Northside Library')
})
```

Analytics, a "last visited" entry in storage and a scroll restore all belong in the same hook.

## Where a guard can live

| Where | Runs | Use for |
| --- | --- | --- |
| `router.beforeEach` | every navigation | a rule about the whole application, such as sign-in |
| `beforeEnter` on a route record | entering that route | a rule about one route, kept next to it |
| `onBeforeRouteLeave` in a component | leaving the route it is on | unsaved changes |
| `onBeforeRouteUpdate` in a component | a param change on the same route | reloading when `:id` changes |

All four take the same kind of function and use the same return values, so a rule can move from one to another
without being rewritten. `beforeEnter` gets `(to, from)` because a per-route guard has no need for a `next`
callback, and the in-component guards are called from a setup block, which is what lets them reach the component's
own state:

```ts
// A component-level guard, called in setup, using the same return values.
onBeforeRouteLeave(() => (dirty.value ? window.confirm('Leave without saving?') : true))
```

## A guard that reads a store

```ts
const session = useSessionStore() // inside the guard: the application exists
```

```ts
const session = useSessionStore() // at module scope: it throws
```

That distinction is the one mistake worth a paragraph, and the error says what happened:

```text
"getActivePinia()" was called but there was no active Pinia. Are you trying to use a store
before calling "app.use(pinia)"?
See https://pinia.vuejs.org/core-concepts/outside-component-usage.html for help.
This will fail in production.
```

The router module is imported by `main.ts` before `app.use(createPinia())` runs, so a store read at the top of it
happens too early. Inside the guard, the application exists. The last line is why this is worth fixing rather than
tolerating: what throws in development is a failure in production.

## Guards are not for fetching

A guard that fetches the record before allowing the route is a guard doing a loader's job badly: the component
still has to handle the case where the record is missing, and the request now happens before the component that
knows what to do with it exists. This project's `BookPanel` awaits its own data and renders its own "not found"
branch, which keeps the guard to one question: may this person open this page.

Two exceptions are worth knowing, because they are places the component cannot reach: a guard reading a permission
that decides whether the route exists at all, and a guard that redirects a record's old id to its new one.

## Check yourself

Add a `/reports` route that requires the `librarian` role, put the role in the session store, and make the guard
redirect to the catalogue with a message. Then write the test that proves a signed out visitor is redirected and
that a signed in one is not.
