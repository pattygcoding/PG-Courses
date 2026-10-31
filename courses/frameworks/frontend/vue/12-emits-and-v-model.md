---
title: Emits and v-model
summary: Reporting upwards, the two-prop contract behind v-model, and the single declaration that replaces it.
chapter: Components
minutes: 14
status: draft
---

## Emitting an event

```vue
<script setup lang="ts">
const emit = defineEmits<{
  chosen: [id: string]
}>()
</script>

<template>
  <RouterLink @click="emit('chosen', book.id)">{{ book.title }}</RouterLink>
</template>
```

```vue
<BookCard :book="book" @chosen="selected = $event" />
```

`defineEmits` with a type declares the events and the payload each one carries. The parent listens with `@` and
reads the payload as `$event`, or names it: `@chosen="(id) => select(id)"`.

The declaration is documentation that the compiler checks. A typo in `emit('chossen')` is a type error, and a
parent listening for an event nobody emits is a type error too, which is the cheapest way to catch a
misunderstanding between two components.

```ts
const emit = defineEmits<{
  joined: [waiting: number]
  failed: [reason: string]
}>()
```

An event name in a template is case insensitive, so `@joined` and `@joinedOnce` are distinct but `@myEvent` is
matched by `@myevent`. Declaring events in camelCase and listening in the same case avoids the question entirely.

## The contract behind v-model on a component

```vue
<AppField :model-value="member" @update:model-value="member = $event" />
```

That is what `v-model="member"` compiles to on a component: one prop down and one event up. The child declares both
and is then compatible with `v-model`:

```ts
const props = defineProps<{ readonly modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
```

Writing those two declarations and wiring the input to them is the version every Vue project had before 3.4. The
single declaration that replaced it is `defineModel`.

## defineModel

```vue
<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  readonly label: string
  readonly name: string
  readonly error?: string
}>()

// v-model on this component is one declaration: the prop and the emit. The
// number case matters, because v-model on `<input type="number">` casts.
const model = defineModel<string | number>({ default: '' })

const fieldId = `field-${props.name}`
const errorId = `${fieldId}-error`
</script>

<template>
  <p class="field">
    <label :for="fieldId">{{ label }}</label>

    <!-- The caller can supply its own control, and gets the wiring with it. -->
    <slot
      :id="fieldId"
      :invalid="error !== undefined"
      :described-by="error === undefined ? undefined : errorId"
    >
      <input
        :id="fieldId"
        v-model="model"
        :name="name"
        v-bind="$attrs"
        :aria-invalid="error !== undefined"
        :aria-describedby="error === undefined ? undefined : errorId"
      />
    </slot>

    <span v-if="error" :id="errorId" class="error" role="alert">{{ error }}</span>
  </p>
</template>
```

That is `AppField.vue`, and the one line that matters here is `const model = defineModel<string | number>({ default: '' })`.
The prop, the emit and the default come from that call, and `v-model="model"` on the input writes through it.

I found the bug this prevents while checking the form in a browser. The first version of this component had no
`defineModel`, and the form used `v-model="member"`. Vue compiled that to `:model-value` and `@update:model-value`,
the component declared neither, so both landed in `$attrs` and were spread onto the input as an attribute named
`model-value`. The input was uncontrolled, the member name never reached the form, and the validation said the name
was too short while the box had text in it. One line of `defineModel` fixed it, and the warning that would have
pointed at it was there to be read: an undeclared `modelValue` is a hint, not a style question.

## Naming the model

```ts
const copies = defineModel<number>('copies', { default: 1 })
```

```vue
<CallCard v-model:copies="copies" />
```

A named model gives the component more than one two-way binding. `v-model:copies` compiles to a `copies` prop and
an `update:copies` event, so a component can take a value that follows the parent and still take plain props
beside it.

## Modifiers

```ts
const [model, modifiers] = defineModel<string>({
  set: (value) => (modifiers.trim ? value.trim() : value),
})
```

```vue
<AppField v-model.trim="member" label="Member" name="member" />
```

`v-model.trim` on a component arrives in `modifiers`, and the `set` transform is where the built-in modifiers for
an input have their counterpart for a component. It is worth knowing that this exists; it is worth using for a
trim or a cap, and not worth inventing new modifiers nobody documented.

## Emitting from an action

```ts
async function join(): Promise<void> {
  const result = await store.join(props.genre, name)

  optimistic.value = null
  message.value = result.message

  if (result.waiting > 0) {
    emit('joined', result.waiting)
  }
}
```

An event is not only for a click. This one reports the answer from a request, which is the pattern for "the child
did the work and the parent owns the number". The event fires after the await, which is why the payload is the
server's number rather than the optimistic guess.

## Check yourself

Build a `StarRating` component with `v-model` for the score, a `max` prop, and an `rated` event fired when the
score changes. Use it twice in one page, once with `v-model` and once with the long `:model-value` and
`@update:model-value` form, and confirm both work.
