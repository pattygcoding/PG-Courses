---
title: Templates and directives
summary: Interpolation, bindings with shorthand, conditions, repetition, and the modifiers that replace event boilerplate.
chapter: Getting started
minutes: 14
status: draft
---

## Interpolation and bindings

```vue
<template>
  <p>{{ book.title }} by {{ book.author }}</p>
  <a :href="url" :title="book.title">Open</a>
  <button :disabled="loans.saving" @click="submit">Record loan</button>
</template>
```

`{{ }}` renders a value as text. A `:` before an attribute binds it to an expression, and `@` binds an event
listener. The two shorthands are `v-bind:` and `v-on:` written short, and both long forms work if you prefer
reading them.

An attribute without the colon is a string:

```vue
<input id="search" type="search" />
<input :id="`field-${name}`" :type="inputType" />
```

Inside `{{ }}` and inside a binding, any expression is allowed. A statement is not:

```vue
<p>{{ count + 1 }}</p>
<p>{{ count > 3 ? 'Plenty' : 'Few' }}</p>
<p v-if="count > 3">Plenty</p>
<!-- {{ if (count > 3) { 'Plenty' } }} is a compile error -->
```

## Conditions

```vue
<p v-if="loading" role="status">Loading the catalogue...</p>
<p v-else-if="error" role="alert">{{ error }}</p>
<template v-else>
  <p>{{ visible.length }} of {{ books.length }} books</p>
  <ul class="books">...</ul>
</template>
```

`v-if` removes and recreates the elements. `v-else-if` and `v-else` have to be on an element immediately after,
with nothing in between.

```vue
<p v-show="pending">filtering</p>
```

`v-show` keeps the element in the DOM and toggles `display`. The trade is straightforward: `v-show` is cheaper
for something toggled often, `v-if` is cheaper for something that is rarely there, and `v-if` is the only one
that runs a component's setup and teardown.

One rule that saves confusion: never put `v-if` and `v-for` on the same element. `v-if` is evaluated first and
cannot see the loop variable, so the condition cannot depend on the item. Move the condition to a wrapper or
filter the list in a computed.

## Repetition

```vue
<option v-for="name in genres" :key="name" :value="name">{{ genreLabel(name) }}</option>
```

```vue
<li v-for="(book, index) in visible" :key="book.id">
  {{ index + 1 }}. {{ book.title }}
</li>
```

The syntax is `(item, index)` for an array, `(value, key, index)` for an object, and a plain count for a number.
`key` is not decoration; the next page is about what it decides.

## Classes and styles

```vue
<li class="card" :class="{ highlighted: highlighted === true }">
```

```vue
<span :class="['chip', { active: isActive, wide: isWide }]">Genre</span>
```

```vue
<div :style="{ paddingLeft: `${copies * 4}px`, color: '#8debc4' }"></div>
```

The object form of `:class` is the one that reads best for a state flag: the key is the class name and the value
is whether it is there. `:class` and `:style` merge with the static attribute rather than replacing it, and they
also merge with a class the parent passes down, which the attributes page comes back to.

## Event modifiers

```vue
<form @submit.prevent="submit">
  <input id="search" v-model="term" type="search" @keyup.enter="run" />
</form>
```

`.prevent` calls `event.preventDefault()`, `.stop` calls `stopPropagation()`, `.once` removes the listener after
the first call, and `.enter` filters by key. A modifier chain reads left to right, and the alternative is the same
two lines written by hand in the handler:

```ts
function submit(event: Event): void {
  event.preventDefault()
  // ...
}
```

I use the modifier when the handler has nothing else to do with the event, and the explicit call when it does.
A form that navigates away because somebody forgot `.prevent` is the mistake this avoids.

## Template refs

```vue
<input ref="field" />
```

```ts
const field = useTemplateRef<HTMLInputElement>('field')

function focus(): void {
  field.value?.focus()
}
```

`useTemplateRef` arrived in Vue 3.5 and replaced the older pair of a `ref(null)` declaration and a matching
`ref="field"` attribute. The ref is filled in after the DOM exists, so reading it during setup gives `null`, which
is what the `?.` is for. The lifecycle page covers when it is safe to read.

## Check yourself

Build a list of books with a search box, a genre filter and a count, using `v-for` with a `key` and `:class` for a
state flag. Then move the condition that hides an empty list into a computed and notice that the template keeps
working while the logic is somewhere you can test.
