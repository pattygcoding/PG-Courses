---
title: Testing routes and the traps
summary: Guard tests that drive the real router, the failures this project hit, and the tests not to write.
chapter: Testing
minutes: 13
status: draft
---

## Driving the real router

```ts
import { beforeAll, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '../index'
import { useSessionStore } from '../../stores/session'
import { BOOKS, stubApi } from '../../__tests__/support'

describe('the router', () => {
  beforeAll(async () => {
    setActivePinia(createPinia())
    stubApi({ '/api/books.json': { json: BOOKS } })
    await router.replace('/')
    await router.isReady()
  })

  it('sends a signed out visitor away from a guarded route', async () => {
    useSessionStore().signOut()

    await router.push({ name: 'loan' })

    expect(router.currentRoute.value.name).toBe('catalogue')
    expect(router.currentRoute.value.query.next).toBe('/loans/new')
  })

  it('lets a signed in member open the form', async () => {
    useSessionStore().signIn('Ada Lovelace')

    await router.push({ name: 'loan' })

    expect(router.currentRoute.value.name).toBe('loan')
  })

  it('answers an unknown path with the not found route', async () => {
    await router.push('/nowhere')

    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('hands a route parameter to the view as a prop', () => {
    const route = router.resolve({ name: 'book', params: { id: 'dune' } })

    expect(route.matched[0]?.props.default).toBe(true)
    expect(route.fullPath).toBe('/books/dune')
  })
})
```

The file imports the application's own router, which is what makes it a test of the guard rather than a test of a
router. Four things about the setup:

- **`beforeAll` rather than `beforeEach`.** The router is a module-level singleton in this application, so one setup
  for the file is enough and it avoids re-importing the whole application per test.
- **`await router.isReady()`** before any assertion. The first navigation resolves asynchronously, and a test that
  pushes before that sees a router that has not settled.
- **A stub for the data**, because the guard's redirect lands on the catalogue and the catalogue's route component
  starts its fetch. A test that leaves `fetch` unstubbed fails on a network call rather than on the behaviour.
- **Pushes, not mounts.** The guards, the redirects and the params are all reachable through the router API with no
  component rendering, which keeps the test fast and its failure messages about routing.

`router.resolve()` is the one to reach for when the question is about configuration rather than navigation: it builds a
route without going there, which is how the `props: true` assertion above works.

## The title, from the after hook

```ts
it('sets the title from the route metadata', async () => {
  await router.push({ name: 'catalogue' })
  expect(document.title).toBe('Catalogue - Northside Library')

  await router.push({ name: 'reports' })
  expect(document.title).toBe('Reports - Northside Library')
})
```

`document` is there because jsdom provides it, and the after hook is a plain function, so the assertion is on the
browser's own state rather than on a wrapper.

## The traps this project hit

**A component that throws while it is set up.** `LoanHint` reads the current book with `useCurrentBook()`, which throws
when no provider exists. The first version of that test set an error handler and looked for the message in it, which
found nothing, because the throw happens during setup and `mount` surfaces it directly:

```ts
// A missing provider throws while the component is being set up, which is
// the loudest failure available and the one a developer wants.
expect(() => mount(LoanHint)).toThrow(
  'useCurrentBook must be used inside a component that provides a book',
)
```

An error thrown later, in a render or a watcher, arrives at `global.config.errorHandler` instead, which is the version
to use for those.

**A `<Suspense>`-wrapped child that renders nothing.** The first version of the waiting panel test mounted the async
component directly and the wrapper came back empty, because an async setup has nothing to render until a boundary above
it resolves. The host component from the previous page is the fix.

**A field typed as a string that receives a number.** The loan form warned during a test run:

```text
[Vue warn]: Invalid prop: type check failed for prop "modelValue".
Expected String with value "14", got Number with value 14.
```

`v-model` on `<input type="number">` casts, so the model has to admit it might be a number. The warning appeared in the
test output because Vue's development warnings go to the console, which makes a test run a cheap place to read them: a
suite that passes with warnings in it is a suite with a bug waiting.

**State that leaks between tests.** A member name written to `localStorage` in one test appeared in the next, and a
test that typed a name found the field already filled. Two lines in the support module's `afterEach` remove the whole
category.

**A stub that is not a `Response`.** A stub resolving a plain object fails inside the code under test, at
`response.ok`, with an error that points at the assertion rather than at the stub. Every stub in this project returns a
real `Response`.

## What to test, and what to skip

| Worth it | Not worth it |
| --- | --- |
| the states a page can be in: loading, error, empty, loaded | the framework: that `v-if` hides an element |
| the request body a form sends | a snapshot of a whole page |
| an optimistic update, with the request in flight | a private helper imported from a component |
| a guard, through the real router | a component's internal refs |
| the fallback of a slot | coverage as a target |

A test earns its place by failing when the feature breaks. The fastest way to check one: break the feature, run the
test, and put it back. A test that stays green is decoration, and decoration is what makes a suite slow and untrusted.

## The pipeline command

```bash
npm run type-check && npm run test:unit -- --run && npm run build
```

The type check first, because it is fastest and it catches a broken test file as well as a broken component. The build
last, because a passing suite on a project that does not compile is not worth much.

## Check yourself

Write a test for a route that requires a role in `meta`, with a signed out case, a signed in case and a wrong role
case. Then spy on `console.warn` and assert that a clean render produces none, which is a cheap way to catch a prop
type problem in a suite that otherwise passes.
