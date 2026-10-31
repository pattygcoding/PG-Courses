---
title: Props
summary: One way data flow, typed declarations, defaults that stay reactive, and what happens to what you do not declare.
chapter: Components
minutes: 13
status: draft
---

## The declaration is the contract

```vue
<script setup lang="ts">
import type { Book } from '../library/book'

const props = defineProps<{
  readonly book: Book
  readonly highlighted?: boolean
}>()
</script>

<template>
  <li :class="{ highlighted: props.highlighted === true }">
    {{ props.book.title }}
  </li>
</template>
```

The type is the runtime declaration: the compiler reads it and generates the checks, so a missing `book` is a
compile error at the call site and a console warning at runtime. `readonly` is the house style here and it is
more than decoration, because a prop is not the child's to change.

```vue
<BookCard :book="book" :highlighted="selected === book.id" />
```

The colon is what makes a prop an expression. Without it, `book="book"` passes the string.

## One way down

```ts
props.book.copies = 2 // compiles when the field is not readonly, and it is still wrong
```

Vue does not stop a child from mutating an object it was handed, because doing so would cost a deep clone per
render. It warns when you assign to a prop directly and does not warn when you mutate inside one, so the rule is
the project's rather than the framework's: a child reads props and reports changes upwards.

The catalogue follows it in two places, with the same shape:

```vue
<WaitingList :genre="book.genre" :waiting="waiting" @joined="record" />
```

```ts
const emit = defineEmits<{
  joined: [waiting: number]
}>()

if (result.waiting > 0) {
  emit('joined', result.waiting)
}
```

The child cannot change the count it was given, so it emits the new one and the parent keeps the number. The
workaround people reach for, a local `ref` initialised from the prop and updated when the prop changes, is two
pieces of state to keep in step; the emit is one.

## Defaults

```ts
const props = withDefaults(
  defineProps<{
    readonly label?: string
    readonly copies?: number
  }>(),
  { label: 'Untitled', copies: 0 },
)
```

```vue
<script setup lang="ts">
const { label = 'Untitled', copies = 0 } = defineProps<{
  readonly label?: string
  readonly copies?: number
}>()
</script>
```

Both work in Vue 3.5, and the second is the one to write now. Reactive props destructure is compiled to property
access on the props object, so `label` in the template stays in step with the prop instead of becoming a snapshot,
and the defaults are plain JavaScript rather than a second object to keep in step with the type.

## Optional, nullable, and boolean

```ts
defineProps<{
  readonly error?: string
  readonly member: string | null
  readonly wide?: boolean
}>()
```

Three different meanings that are easy to blur:

- `error?: string` may be absent, so it is `string | undefined`.
- `member: string | null` is required and may be explicitly null.
- `wide?: boolean` has Vue's boolean casting: `<Card wide />` passes `true`, and an absent `wide` is `false`
  rather than `undefined`.

That last rule is why `:disabled` behaves the way it does on an HTML element and why a boolean prop is best
written with a default of `false`.

## Props are not attributes

```vue
<AppField
  v-model="member"
  label="Member"
  name="member"
  :error="errors.member"
  type="number"
  autocomplete="name"
/>
```

`label`, `name` and `error` are declared props, and the rest, `type` and `autocomplete`, are not. Vue puts
undeclared attributes on the component's root element, which is why `type="number"` lands on the input inside
`AppField` rather than being thrown away. That fallthrough is a feature and occasionally a surprise, and the
attributes page is where it gets taken apart.

## Validating a prop beyond its type

```ts
defineProps({
  genre: {
    type: String,
    required: true,
    validator: (value: string) => ['poetry', 'non-fiction', 'science-fiction'].includes(value),
  },
})
```

A validator in the runtime declaration warns in development when the value is outside the list. It is worth it
for a prop that comes from a URL, where a user can type anything, and unnecessary for a prop whose type already
says everything a reader needs.

## Check yourself

Take the `BookCard` component, add an optional `note` prop with a default, and pass it in some places and not
others. Then pass an undeclared attribute such as `data-testid` and confirm where it lands in the DOM, and read
what the compiler says when you leave out a required prop.
