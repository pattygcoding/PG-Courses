---
title: Lifecycle and template refs
summary: The hooks worth knowing, when the DOM exists, and the two hooks that catch an error instead of throwing it.
chapter: Reactivity
minutes: 13
status: draft
---

## The hooks, in order

```ts
import { onBeforeMount, onMounted, onUnmounted, onUpdated } from 'vue'

onBeforeMount(() => {
  // setup is done, nothing is in the DOM yet
})

onMounted(() => {
  // the element and its children are in the document
})

onUpdated(() => {
  // the DOM has been patched after a change
})

onUnmounted(() => {
  // the component's elements are gone
})
```

The two that earn their place in most components are `onMounted` and `onUnmounted`. The rest are worth
recognising and rarely worth reaching for: work that belongs in an update hook is usually a watcher with
`flush: 'post'`, which says what it is watching.

```ts
onMounted(() => {
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
```

A component with no `onUnmounted` is the one to look at first when a page leaks a listener, a timer or a
subscription. `onScopeDispose` is the same hook in the form a composable can use, since a composable does not
know whether it was called from a component at all.

## The order is children first

```text
parent setup
  child setup
  child onMounted
parent onMounted
```

A parent's `onMounted` runs after its children's, because the DOM the parent would measure is only complete once
the children have rendered. The teardown order is the reverse: a parent's `onUnmounted` runs first.

That matters when the mounted hook does something with a child's element through a template ref. Two components
deep, the ref is filled in already; one level up, it is.

## Reading the DOM

```vue
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

const field = useTemplateRef<HTMLInputElement>('field')

onMounted(() => {
  field.value?.focus()
})
</script>

<template>
  <input ref="field" />
</template>
```

`useTemplateRef` arrived in Vue 3.5. It pairs a name in the template with a ref in the script, and the ref is typed
from the generic you give it. During setup the value is `null`; after mount it holds the element, and after unmount
it goes back to `null`.

```ts
const fields = useTemplateRef<HTMLInputElement[]>('fields')
```

```vue
<input v-for="row in rows" :key="row.id" ref="fields" />
```

A ref used inside a `v-for` collects the elements into an array. The array is in DOM order, and it is rebuilt
after every update that changes the list, so code that keeps a reference to one element keeps a reference to an
element that may no longer be in the document.

## nextTick

```ts
const term = ref('')

async function focusAndClear(): Promise<void> {
  term.value = ''
  await nextTick()
  field.value?.focus()
}
```

`nextTick` returns a promise that resolves after the DOM has been updated. Vue batches updates within a tick, so
code that changes state and immediately reads the DOM sees the old DOM unless it waits. A watcher with
`flush: 'post'` and `onUpdated` are the other ways to be sure the DOM is current, and both are usually clearer
than scattering `nextTick` through handlers.

## Errors

```vue
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const failed = ref(false)

onErrorCaptured((error, instance, info) => {
  console.error('A component threw during', info, error, instance)
  failed.value = true

  // Stop the error here rather than letting it reach the application handler.
  return false
})
</script>

<template>
  <slot v-if="!failed" />
  <slot v-else name="fallback" />
</template>
```

That is `ErrorBoundary.vue` from this project, and it is the whole of it. `onErrorCaptured` runs for an error
thrown in a descendant: while rendering, in a lifecycle hook, in a watcher, or in an async callback. Returning
`false` stops the error from travelling further up, which is what keeps a broken panel from taking the page with
it.

```ts
app.config.errorHandler = (error, instance, info) => {
  console.error('A component threw during', info, error, instance)

  // In an application with a reporting service, this is where it goes.
  // reportToSentry(error, { info, component: instance?.$options.name })
}
```

That is the handler installed in `main.ts` of this project, and it is the last stop: an error that no boundary
caught arrives here rather than disappearing. The catalogue wraps its waiting panel in the boundary above, so a
failed request in that panel shows a sentence while the book's title, author and link keep working.

Two things `onErrorCaptured` does not catch: an error thrown in a `setTimeout` callback that nothing awaits, and a
rejected promise nobody handles. Both arrive at `window.onunhandledrejection` or the console, so a promise in a
component needs a `catch` or an `await` inside a `try`.

## Check yourself

Add a component that measures its own height in `onMounted` and logs it, then wrap it in another component that
logs in its own `onMounted`. Read the order in the console, and explain why the wrapper is second. Finally, make
the inner component throw while rendering and confirm the boundary shows its fallback slot.
