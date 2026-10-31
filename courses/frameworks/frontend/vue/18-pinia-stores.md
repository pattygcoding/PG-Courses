---
title: Pinia stores
summary: A setup store is a composable with a name, and storeToRefs is why destructuring works.
chapter: Forms and app state
minutes: 14
status: draft
---

## A store is a setup function

```ts
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', () => {
  const member = ref<string | null>(null)

  function signIn(name: string): void {
    member.value = name.trim()
  }

  function signOut(): void {
    member.value = null
  }

  return { member, signIn, signOut }
})
```

That is the whole of `session.ts`, and it is a composable with an id. `defineStore` takes the name the devtools and
the store registry use, and a function that returns what the store exposes. Refs become state, computed values
become getters, functions become actions, and there is nothing else to learn about the shape.

The id has to be unique. Two stores with the same id share state rather than failing, which is a confusing bug when
a copy and paste carries the name along.

## Reading it in a component

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSessionStore } from './stores/session'

const session = useSessionStore()
const { member } = storeToRefs(session)
</script>
```

```ts
const session = useSessionStore()
session.member // the value, unwrapped
```

Calling the store function returns the store. `session.member` works in a template because the store is reactive;
the one thing that does not work is destructuring the store object itself:

```ts
const { member } = useSessionStore() // a snapshot of the value, and no longer reactive
```

That is the same trap as destructuring any reactive object, and `storeToRefs` is the way through it. It takes the
store and returns the refs, leaving the actions alone:

```ts
const { member, receipts } = storeToRefs(session) // refs
const { signIn, signOut } = session // functions, and stable, so no storeToRefs needed
```

## Where a store is used

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

The comment in that guard is the mistake worth naming. `useSessionStore()` at the top of the router module runs
before `app.use(createPinia())` in `main.ts`, so Pinia has no active instance and the call throws. The message
carries Pinia's own marker, then this text:

```text
"getActivePinia()" was called but there was no active Pinia. Are you trying to use a store
before calling "app.use(pinia)"?
See https://pinia.vuejs.org/core-concepts/outside-component-usage.html for help.
This will fail in production.
```

Calling it inside the guard moves the call to a moment when the application exists, and the same rule covers a
store read in a plain function or a module-level watcher: read the store where the work happens rather than where
the module is loaded.

The third line is the one to take seriously. A store read before Pinia is installed is not a warning in a production
build; it is a failure, and the fix belongs at the first occurrence rather than at the report.

## Actions own the writes

```ts
export const useLoansStore = defineStore('loans', () => {
  const error = ref<string | null>(null)
  const saving = ref(false)
  const receipts = ref<LoanReceipt[]>([])

  async function borrow(loan: Loan): Promise<LoanReceipt | null> {
    saving.value = true
    error.value = null

    try {
      const receipt = await requestLoan(loan)
      receipts.value = [...receipts.value, receipt]
      return receipt
    } catch (failure) {
      error.value = failure instanceof Error ? failure.message : 'The loan could not be recorded.'
      return null
    } finally {
      saving.value = false
    }
  }

  return { error, saving, receipts, borrow }
})
```

Three decisions in that action:

- **The flags are state**, so a component can render a disabled button and an error message without knowing anything
  about the request.
- **The failure becomes a message and a `null` return**, so the calling component decides whether that means staying
  on the form or going back to the catalogue. A store that throws forces every caller into a `try`.
- **`finally` clears the flag**, whatever the outcome. That is the line that makes a failed request recoverable.

The store does not navigate, does not render and does not know about the router. It owns loan data, and the component
decides where the person goes next, which is what keeps the store testable without a router.

## Why not one store per page

```text
session.ts   who is signed in
loans.ts     what was borrowed, and the state of the last attempt
catalogue    no store: the books belong to the route that reads them
```

A store is for state that outlives a page: the session in this project, the loan list, a shopping basket, a settings
object. Books that one route fetches and renders do not need one, and putting them in a store means deciding when
they become stale, when to refetch and who clears them. The route already answers all three.

## Testing a store

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLoansStore } from '../loans'
import { stubApi } from '../../__tests__/support'

describe('the loans store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('records a loan and keeps the receipt', async () => {
    stubApi({ '/api/loans': { status: 201, json: { id: 'loan-1', dueOn: '2026-11-14' } } })

    const store = useLoansStore()
    const receipt = await store.borrow({ member: 'Ada Lovelace', bookId: 'dune', days: 14 })

    expect(receipt?.dueOn).toBe('2026-11-14')
    expect(store.receipts).toHaveLength(1)
    expect(store.error).toBeNull()
    expect(store.saving).toBe(false)
  })
})
```

A fresh Pinia per test is what keeps one test's state out of the next, and `setActivePinia` is what makes
`useLoansStore()` work outside a component. No mounting, no router and no DOM: the store is a function with state,
and the test calls it.

## Check yourself

Add a `fines` store with a `total` getter computed from a list of fines, an action that adds one, and an action that
settles one. Write the three tests first, then make them pass, and check with `storeToRefs` that the getter updates
a component when an action runs.
