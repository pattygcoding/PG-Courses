---
title: What Vue is
summary: A runtime plus a template compiler, one file per component, and a reactivity system that tracks what you read.
chapter: Getting started
minutes: 13
status: draft
---

## Two halves

```json
"dependencies": {
  "pinia": "^4.0.3",
  "vue": "^3.5.42",
  "vue-router": "^5.3.1"
}
```

`vue` is the only one of those three that is Vue itself. It contains two things that are worth naming
separately:

- **The runtime** renders components, stores state, and updates the DOM. It has no opinion about syntax.
- **The compiler** turns a template into a render function. It runs in the build, and it is the reason a change
  to a template is fast: the compiler reads the template and attaches a note to each part of the output saying
  what can change.

```js
_createElementVNode("p", null, "by " + _toDisplayString(_ctx.book.author) + ..., 1 /* TEXT */)
```

That trailing comment is a patch flag, and it came out of this course's build. It tells the runtime that the only
thing which can change inside this paragraph is its text, so the runtime does not compare attributes, children
or anything else. The compiler page takes that apart properly; the point here is that the template is compiled
rather than interpreted.

## One file per component

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Book } from '../library/book'

defineProps<{
  readonly book: Book
}>()
</script>

<template>
  <li class="card">
    <RouterLink :to="{ name: 'book', params: { id: book.id } }">{{ book.title }}</RouterLink>
    <p>by {{ book.author }}</p>
  </li>
</template>

<style scoped>
.card {
  padding: 0.5rem 0;
}
</style>
```

A single file component holds the script, the template and the styles for one component, and the build turns the
three into one module. Two details do most of the work:

- `<script setup>` marks the block as a setup function. Anything declared at the top level of it is available in
  the template, and the compiler generates the glue. There is no `data()`, no `methods`, no `return` statement
  handing values to the template.
- `scoped` on the style block makes the build add a data attribute to the elements and a matching attribute
  selector to the CSS, so a rule written here cannot reach another component. The SSR page later on shows the
  attribute in the server's HTML: `data-v-c3b10b9f`.

## The reactivity system

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const term = ref('')
const books = ref<readonly Book[]>([])

const visible = computed(() =>
  books.value.filter((book) => book.title.toLowerCase().includes(term.value.toLowerCase())),
)
</script>
```

`ref` creates a value Vue can watch. `computed` creates a value that is recalculated only when something it read
changed, and the template updates only where that value is used. There is no subscription to register and no
dependency array to write: reading a reactive value inside a computation is what registers the dependency.

That is the model in one sentence, and most of the chapter on reactivity is the consequences: what happens when a
value stops being read through the reactive wrapper, when a computed is worth it, and when a watcher is the right
tool instead.

## What is around Vue

| Need | Where it comes from |
| --- | --- |
| routing | `vue-router`, official |
| state | `pinia`, official |
| the build and the dev server | Vite plus `@vitejs/plugin-vue` |
| tests | Vitest plus `@vue/test-utils` |
| composables for common browser work | `@vueuse/core`, community |
| devtools | the browser extension, and `vite-plugin-vue-devtools` |
| server rendering, routing and data in one framework | Nuxt |

The first two are installed by the scaffold, which is why this course uses them. Vue also supports two
syntaxes for writing a component: the Options API, where a component is an object with `data`, `methods` and
`computed`, and the Composition API with `<script setup>`, which this course uses. Both are supported and the
second is what the documentation and the ecosystem have settled on for new code.

## The versions this course targets

```text
vue          3.5.44
vue-router   5.4.0
pinia        4.1.0
vite         8.3.5
typescript   6.0.3
vue-tsc      3.3.14
vitest       4.1.12
```

Everything in the pages that follow was run against those versions, and every error message and output block
quoted here came out of that run.

## Check yourself

Create a project and open one of the `.vue` files the scaffolder wrote. Rewrite the `<script setup>` block as an
Options API component with `data()` and `computed`, keep the template unchanged, and confirm both render the
same HTML.
