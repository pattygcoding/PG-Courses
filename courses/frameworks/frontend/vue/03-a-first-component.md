---
title: A first component
summary: Script setup, a template that reads it, scoped styles, and the three files that put a component on the page.
chapter: Getting started
minutes: 13
status: draft
---

## The component

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Book } from '../library/book'
import { genreLabel } from '../library/genre'

defineProps<{
  readonly book: Book
  readonly highlighted?: boolean
}>()

const emit = defineEmits<{
  chosen: [id: string]
}>()
</script>

<template>
  <li class="card" :class="{ highlighted: highlighted === true }">
    <RouterLink :to="{ name: 'book', params: { id: book.id } }" @click="emit('chosen', book.id)">
      {{ book.title }}
    </RouterLink>
    <p>by {{ book.author }} - {{ genreLabel(book.genre) }}</p>
  </li>
</template>

<style scoped>
.card {
  padding: 0.5rem 0;
}

.card.highlighted {
  border-left: 2px solid #8debc4;
  padding-left: 0.75rem;
}
</style>
```

That is `BookCard.vue` from the catalogue, and it shows the four things every component does:

- **Declares what it takes.** `defineProps` with a type makes `book` required and `highlighted` optional. The
  compiler generates the runtime declaration from the type, so there is no second list to keep in step.
- **Declares what it reports.** `defineEmits<{ chosen: [id: string] }>()` says one event named `chosen` carries a
  string. The parent listens with `@chosen`, and the compiler checks the payload.
- **Returns what goes on screen.** The template is the return value. Values in `{{ }}` are rendered as text, and
  an attribute with a colon in front of it is bound to an expression rather than passed as a string.
- **Styles itself.** `scoped` keeps the rules inside.

## The smallest component

```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button type="button" @click="count++">Count is {{ count }}</button>
</template>
```

`ref(0)` creates a reactive value. In the template it is written and read like a number, and the compiler adds
the `.value` for you. In the script block it is an object, so the same value is `count.value` there:

```ts
const count = ref(0)

count.value += 1
```

That split is the first thing to get used to. A `ref` inside a template is unwrapped; a `ref` inside a script is
an object with one property. The reactivity page explains why unwrapping has to happen at all.

## How a component runs

```text
setup()          the script block runs once, creating the state
render()         the template runs, reading the state it needs
patch()          the DOM is updated where the render output changed
```

The setup block runs once per component instance, not once per update. That is why a `const` in setup keeps its
identity across renders, and why it is the wrong place to compute something from a prop: the value is calculated
once and the prop moves on. `computed` exists for that case, and it is the subject of the reactivity chapter.

## Mounting it

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

```html
<div id="app"></div>
```

Vue replaces the content of the element it mounts on. The root component is a normal component: it can take
props, though nothing passes any to it, and it renders whatever else the application needs. In this project the
root renders a header, a `<RouterView />` inside a `<Suspense>` boundary, and nothing else.

## Names and files

```ts
import BookCard from '@/components/BookCard.vue'
```

```vue
<BookCard :book="book" @chosen="selected = $event" />
```

Three conventions worth keeping:

- The file is named after the component in PascalCase, and the import matches. A search for `BookCard` finds both
  the file and every place it is used.
- In a template, a PascalCase tag is a component and a lowercase tag is an HTML element. That is how
  `<BookCard>` and `<li>` are told apart; the compiler decides by the capital letter.
- A component registered nowhere and imported directly is used directly. There is no registration step for local
  components in `<script setup>`; importing is using.

## Check yourself

Write a `Chip.vue` with a required `label` prop, an optional `removable` flag, and an `removed` event it emits
when a button inside it is clicked. Use it in a list with a `v-for`, and confirm with `npm run type-check` that a
missing `label` is a compile error rather than a blank chip.
