---
title: Attributes and exposed methods
summary: Where an undeclared attribute lands, the two ways to control that, and the surface a parent is allowed to call.
chapter: Components
minutes: 13
status: draft
---

## Fallthrough

```vue
<AppField v-model="member" label="Member" name="member" :error="errors.member" autocomplete="name" />
```

`label`, `name` and `error` are declared props, and `autocomplete` is not. Vue puts undeclared attributes on the
component's root element, so the attribute arrives on the input inside `AppField` rather than being dropped:

```html
<input id="field-member" name="member" autocomplete="name" aria-invalid="false" />
```

The same rule handles `class` and `style`, with one addition: they merge rather than replace. A class passed by the
parent and a class written in the child's template both end up on the root element, which is how a component can
have its own look and still accept a layout class from the page.

Two consequences worth knowing:

- **A component with one root element inherits everything.** A component with several roots cannot, and Vue warns
  that the attributes could not be inherited automatically. The fix is `inheritAttrs: false` plus binding
  `$attrs` where they belong.
- **`v-on` listeners fall through too.** An undeclared `@click` on a component ends up on the root element, which is
  what makes a wrapper around a button behave like a button.

## Taking control of the attributes

```vue
<script setup lang="ts">
/**
 * A labelled field. The label, the invalid state and the message are wired
 * together here so a form cannot forget one of them.
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  readonly label: string
  readonly name: string
  readonly error?: string
}>()

const fieldId = `field-${props.name}`
const errorId = `${fieldId}-error`
</script>

<template>
  <p class="field">
    <label :for="fieldId">{{ label }}</label>

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

`inheritAttrs: false` stops Vue from putting the extras on the root element, which here is a `<p>` wrapper. Without
it, `type="number"` would land on the paragraph and the input would render as text. `v-bind="$attrs"` puts them
where they belong.

`$attrs` is reactive, so `useAttrs()` in the script gives the same object to code that needs to read it. Both are
the escape hatch for a component that wraps a control, and it is worth using it exactly there rather than in a
component whose root element is the control already.

## A slot with the wiring

```vue
<AppField label="Book" name="bookId" :error="errors.bookId">
  <template #default="{ id, invalid, describedBy }">
    <select
      :id="id"
      v-model="bookId"
      name="bookId"
      :aria-invalid="invalid"
      :aria-describedby="describedBy"
    >
      <option value="">Choose a book</option>
      <option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }}</option>
    </select>
  </template>
</AppField>
```

The field builds the ids and the aria attributes, and a caller that needs a different control takes them from the
slot props. A select is the case in this project's loan form, and the alternative was a second labelled-control
component with the same wiring copied into it.

## defineExpose

```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

function reset(): void {
  count.value = 0
}

defineExpose({ count, reset })
</script>

<template>
  <p>{{ count }}</p>
</template>
```

```vue
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import ScratchExposed from './ScratchExposed.vue'

const panel = useTemplateRef<InstanceType<typeof ScratchExposed>>('panel')

onMounted(() => {
  panel.value?.reset()
})
</script>

<template>
  <ScratchExposed ref="panel" />
</template>
```

A `<script setup>` component is closed by default: a parent holding a template ref gets nothing but the DOM
element. `defineExpose` opens a named surface, and `InstanceType<typeof Child>` is the type that surface produces,
so `panel.value?.reset()` type-checks and a call to a method the child did not expose is a compile error.

Reaching into a child is the pattern to use last. Everything in this chapter, a prop, an emit, a slot or a
provided ref, is a way to avoid it, and the cases that remain are genuinely imperative: focus, scroll, play, reset,
measure. When a child exposes a method, the method should read like a verb the parent would use, which `reset`
does and `setCount` does not.

## Check yourself

Wrap a `<button>` in a `PrimaryButton` component that declares no props, and check with the browser inspector where
a passed `type`, `disabled` and `@click` land. Then add a second root element to the component and read the warning
Vue gives you, and fix it with `inheritAttrs: false` and `v-bind="$attrs"` on the button.
