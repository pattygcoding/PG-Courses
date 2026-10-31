---
title: Slots
summary: Content passed in from outside, the props a slot hands back, and the re-render it costs when it is dynamic.
chapter: Components
minutes: 14
status: draft
---

## Default and named slots

```vue
<template>
  <section class="panel">
    <h2>{{ heading }}</h2>
    <slot />
  </section>
</template>
```

```vue
<Panel heading="Book details">
  <p>The waiting list is below.</p>
</Panel>
```

A slot is the hole a component leaves for content it did not write. The content is compiled in the *parent's*
scope, so it can read the parent's state: a `v-if` inside a slot sees the catalogue's `selected`, not the panel's
props. That is the whole reason slots exist, and it is what separates them from props.

```vue
<template>
  <section class="panel">
    <header><slot name="heading" /></header>
    <slot />
    <footer><slot name="footer">Nothing else to add.</slot></footer>
  </section>
</template>
```

Named slots give a component more than one hole. The content between the tags is the default slot, and the
fallback inside `<slot>` renders when the caller supplies none.

## Slot props

```vue
<template>
  <li class="card">
    <slot name="footer" :copies="book.copies">
      <span class="copies">{{ book.copies }} on the shelf</span>
    </slot>
  </li>
</template>
```

```vue
<BookCard :book="book">
  <template #footer="{ copies }">
    <span class="copies">{{ copies }} on the shelf</span>
    <span v-if="book.id === selected"> (last opened)</span>
  </template>
</BookCard>
```

`<slot :copies="...">` hands a value back to whoever supplies the content, and `<template #footer="{ copies }">`
destructures it. The parent decides what to do with it, which is how a list component can own the layout and the
page can own the appearance.

That example also shows the two scopes meeting: `copies` comes from the child through the slot props, and
`book.id === selected` is the parent's own state. Both are available in the same template.

## A fallback that is the same content

```vue
<slot name="footer" :copies="book.copies">
  <span class="copies">{{ book.copies }} on the shelf</span>
</slot>
```

The fallback is not a second implementation to keep in sync. It is the default the component would render if the
caller said nothing, which is why the catalogue's cards look right with no slot supplied at all. Testing that is
two lines and it caught a mistake while writing this project:

```ts
it('falls back to its own footer when the caller gives none', () => {
  const wrapper = mount(BookCard, { props: { book: dune }, global: { plugins: [router()] } })

  expect(wrapper.text()).toContain('3 on the shelf')
})
```

## The dynamic slot, measured

Slots are compiled into functions on the parent's vnode. A component that receives slots is treated as needing an
update whenever its parent renders, because Vue cannot know whether the slot content changed without calling it.

The probe in this project counts the renders of each card while the search box is typed into, and the two runs
differ by one thing: whether the parent passes a `#footer` slot.

| The catalogue's card | Renders after four keystrokes |
| --- | --- |
| with `<template #footer="{ copies }">` passed in | 4 |
| with no slot passed in | 1, unchanged |

The parent rendered four times in both runs. In the first, each render came with a new slot function, so the child
rendered again with it. In the second, the child's props were the same array element it already had, and Vue
skipped it.

Two consequences worth keeping:

- A component with no slots is cheaper to re-render than one with slots, which is an argument for passing data as
  props when the content does not need the parent's scope.
- `v-once` on slot content, or a slot built once and stored, removes the cost when the content genuinely cannot
  change. The performance chapter covers both.

## Slot names and dynamic slots

```vue
<template #[name]="slotProps">...</template>
```

```ts
const name = ref<'footer' | 'heading'>('footer')
```

A dynamic slot name is a `v-bind` on the directive, written `#[name]`, which is what a table component uses when
the caller picks the column layout. It is worth knowing, and it is rarely the clearest way to solve a layout
problem.

## Check yourself

Write a `Card` component with a default slot, a `heading` slot, and a `footer` slot that hands back a `copies`
number and falls back to a sentence. Use it three times with different content, and then measure how many times the
card renders while an input on the page changes, with and without slot content passed in.
