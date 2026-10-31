---
title: Testing stores and composables
summary: setActivePinia, effectScope, fake timers and the deferred promise that lets a test see a request in flight.
chapter: Testing
minutes: 13
status: draft
---

## A store, with no component

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

  it('keeps the message from a rejected loan and reports no receipt', async () => {
    stubApi({ '/api/loans': { status: 500, json: {} } })

    const store = useLoansStore()
    const receipt = await store.borrow({ member: 'Ada Lovelace', bookId: 'dune', days: 14 })

    expect(receipt).toBeNull()
    expect(store.error).toBe('The loan could not be recorded (status 500).')
    expect(store.receipts).toHaveLength(0)
  })
})
```

Two lines make a store testable outside a component: `setActivePinia(createPinia())` in a `beforeEach`, which gives
`useLoansStore()` an instance to attach to, and a fresh Pinia per test, which is what stops one test's receipts from
appearing in the next.

A store is a composable, so a test is a function call and four assertions. No mounting, no router, and no DOM: the
action ran, the state changed, and the values are there to read.

## A composable, in a scope

```ts
import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useDebouncedRef } from '../useDebouncedRef'

describe('useDebouncedRef', () => {
  it('passes a value on once the changes stop', async () => {
    vi.useFakeTimers()

    const source = ref('')
    const { value, pending } = effectScope().run(() => useDebouncedRef(source, 300))!

    source.value = 'd'
    source.value = 'du'
    await nextTick()

    expect(pending.value).toBe(true)
    expect(value.value).toBe('')

    vi.advanceTimersByTime(300)

    expect(value.value).toBe('du')
    expect(pending.value).toBe(false)
  })
})
```

Three details make that test work, and each one is a mistake waiting to happen:

- **`effectScope().run(...)`.** A composable that calls `watch` or `onScopeDispose` needs a scope. Inside a component
  the component is the scope; in a test, `effectScope` provides one. The `!` at the end is there because `run` is
  typed as possibly returning undefined.
- **`await nextTick()` after the change.** A `watch` callback runs on the next tick by default, so the debounce timer
  has not been started yet at the line after the assignment. Without the await, `pending` is still false and the test
  fails for a reason that has nothing to do with the composable.
- **`vi.useFakeTimers()`** so `advanceTimersByTime` can move the clock. The support module's `afterEach` puts the real
  timers back, which is what stops a faked clock from leaking into the next test.

The second test in that file is the cleanup: it stops the scope, advances the clock, and asserts that the value never
changed, which is what proves the `onScopeDispose` in the composable is doing something.

## A promise the test controls

```ts
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })

  return { promise, resolve }
}
```

```ts
it('counts the new borrower before the request has answered', async () => {
  const post = deferred<Response>()
  vi.stubGlobal('fetch', vi.fn(() => post.promise))

  const wrapper = mount(WaitingList, { props: { genre: 'poetry', waiting: 2 } })

  await wrapper.get('input').setValue('Ada Lovelace')
  await wrapper.get('form').trigger('submit')

  // The optimistic value, while the POST is still open.
  expect(wrapper.text()).toContain('3 borrowers are waiting for Poetry')

  post.resolve(backlogResponse(9))
  await flushPromises()

  expect(wrapper.emitted('joined')).toEqual([[9]])
})
```

A `vi.fn()` that returns a handled promise cannot show a pending state: the assertion runs after the request has
already resolved. The deferred promise is what makes "while the request is in flight" a thing a test can look at, and
it is the only way to test an optimistic update honestly.

`flushPromises()` from `@vue/test-utils` resolves every pending promise and waits for the DOM to update, which is what
the `await` after `post.resolve` is for. Vue updates asynchronously, so the promise settling and the DOM changing are
two separate moments.

## What to assert on a request

| The test | The assertion |
| --- | --- |
| the happy path | the state the request produced, and the flags back to false |
| a rejected request | the message, and that the state was not changed |
| a pending request | the optimistic value, and the state of the submit control |
| a superseded request | the abort, and that the older answer did not win |
| the body that was sent | `bodyOf(fetchMock, 'POST')`, which no rendering test can check |

That last row is the one people skip. A form that posts `{ memberName: ... }` where the API expects `{ member: ... }`
renders perfectly, passes every rendering test, and fails in production.

## Check yourself

Write a test for `useBooks` that fails the first request and succeeds on the second, asserts the error message after
the first, and asserts the books after `reload()`. Then write the version that never aborts and explain which
assertion starts failing.
