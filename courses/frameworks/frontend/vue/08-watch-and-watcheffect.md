---
title: watch and watchEffect
summary: Running work when something changes, choosing when it runs, and cleaning up after a value that outlives the call.
chapter: Reactivity
minutes: 15
status: draft
---

## The two forms

```ts
import { watch, watchEffect } from 'vue'

watch(term, (next, previous) => {
  console.log(next, previous)
})

watchEffect(() => {
  console.log(term.value)
})
```

`watch` takes a source and a callback. `watchEffect` runs the callback immediately and tracks whatever it reads,
so the dependencies come from the body rather than from an argument. I use `watch` almost always, because the
source is written down where a reader can find it.

## What can be a source

```ts
watch(term, handler)                            // a ref
watch(() => props.id, handler)                  // a getter, for a prop or a nested value
watch([term, genre], handler)                   // several sources
watch(books, handler, { deep: true })           // the whole object, including the inside
watch(() => route.query, handler, { deep: true }) // a getter that returns an object needs deep
```

A `ref` is watched by reference: assigning a new value fires the callback. A getter is watched by its return
value, so `() => props.id` fires when the prop changes and `() => state.nested.count` fires when the count
changes. Watching a reactive object directly needs `deep`, because otherwise only a new object would count, and a
reactive object never becomes a new object.

## When it runs

```ts
watch(term, (next) => {
  router.replace({ query: { q: next } })
}, { flush: 'post' })
```

| `flush` | The callback runs |
| --- | --- |
| `'pre'` (the default) | before the component updates, with `nextTick` available |
| `'post'` | after the component has updated, so the DOM is current |
| `'sync'` | immediately on every change, which is rarely what you want |

A watcher that reads the DOM, focuses an element or measures something needs `'post'`. A watcher that writes other
state wants the default, so that the write lands in the same update as the change that caused it. `immediate: true`
runs the callback once at setup, which is how the catalogue's `useBooks` composable loads its data without waiting
for a first change:

```ts
watch(
  attempt,
  () => {
    // start the request
  },
  { immediate: true },
)
```

## Cleanup

```ts
watch(genre, (next) => {
  const controller = new AbortController()

  fetchBacklog(next, controller.signal).then((backlog) => {
    waiting.value = backlog.waiting
  })

  // Runs when the source changes again, and when the component goes away.
  onCleanup(() => controller.abort())
})
```

`onCleanup` is passed into the callback as the third argument, and it exists so that a request, a timer or a
subscription started by the watcher can be undone next to the code that started it. Without it, a slow first
request can land after a fast second one and the page shows the older answer. This project's `useBooks` composable
does the same thing with `onScopeDispose`, which is the version that works outside a component.

## A debounce, in the real catalogue

```ts
const { value: query, pending } = useDebouncedRef(term, 300)

watch(query, (next) => {
  void router.replace({ query: { ...route.query, q: next === '' ? undefined : next } })
})
```

That is the composable this project uses, and its body is a watcher with a timer and a cleanup:

```ts
export function useDebouncedRef<T>(
  source: Ref<T>,
  delay = 300,
): { readonly value: Ref<T>; readonly pending: Ref<boolean> } {
  const value = ref(source.value) as Ref<T>
  const pending = ref(false)

  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (next) => {
    pending.value = true
    clearTimeout(timer)

    timer = setTimeout(() => {
      value.value = next
      pending.value = false
    }, delay)
  })

  onScopeDispose(() => clearTimeout(timer))

  return { value, pending }
}
```

The input is bound to `term` and updates on every keystroke. The URL is written 300 ms after the typing stops,
because the watcher watches the debounced value rather than the raw one. `pending` is what puts the word
"filtering" next to the box while a write is waiting.

## Stopping a watcher

```ts
const stop = watch(term, handler)

stop()
```

A watcher created in a component's setup stops when the component is unmounted. A watcher created outside, in a
plain function or a module, does not, which is the leak to look for when a page keeps reacting after it is gone.
`watchEffect` returns the same stop function, and `effectScope` groups several watchers into one object that stops
them together.

## watchEffect, and when it is the wrong tool

```ts
watchEffect(() => {
  document.title = `${books.value.length} books`
})
```

That reads well, and the dependencies are the two reactive values it touched. Two things make it harder to reason
about in a larger component: the dependency list is invisible, so a reader has to run the body to know when it
fires, and it runs once immediately whether or not anything changed. I reach for it for a small, self-evident
effect, and use `watch` when the source matters to the reader or the timing matters to the code.

## Check yourself

Write a watcher on a search term that writes the value to `localStorage` 300 ms after typing stops, with a cleanup
that cancels the timer, and a second watcher with `flush: 'post'` that focuses an input when a panel opens.
Explain which of the two would be wrong with the other flush setting.
