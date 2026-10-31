---
title: The reactivity traps
summary: Destructuring, arrays, maps and the two kinds of reactivity that cost different amounts.
chapter: Reactivity
minutes: 14
status: draft
---

## The four traps

Every one of these produces the same symptom: the value changes and the page does not.

```ts
// 1. a primitive destructured out of a reactive object
const { title } = book.value // a copy, not a link

// 2. a reactive object replaced by a plain one
let state = reactive({ count: 0 })
state = { count: 1 } // nothing tracks this any more

// 3. a computed that reads a snapshot
const plain = { title: 'Dune' }
const label = computed(() => plain.title) // never updates, because nothing reactive was read

// 4. a ref replaced instead of written through
const count = ref(0)
count = 1 // "Assignment to constant variable", and it was never the way to write
count.value = 1 // the write, and the reason ref has a .value at all
```

In a template the same write is `count = 1`, because the compiler inserts `.value` for you. That difference
between the two contexts causes more confusion than any other part of the API.

The first is the one to know by name, because props hit it too. A prop that is an object can be destructured and
still be reactive, since what you hold is the same proxy. A prop that is a string cannot:

```ts
// keeps working, the object is a proxy
const { book } = defineProps<{ book: Book }>()

// a snapshot of a string, and the template stops following the prop
const { id } = defineProps<{ id: string }>()
```

`toRef` fixes the second case, and Vue 3.5's reactive props destructure fixes it at the source:

```vue
<script setup lang="ts">
const { label = 'Untitled', copies = 0 } = defineProps<{
  readonly label?: string
  readonly copies?: number
}>()
</script>
```

Destructuring in the parameter list is compiled into property access on the props object rather than a read, so
`label` in the template stays in step with the prop. Defaults work the same way, which retires `withDefaults` for
most components. That snippet type-checks and runs in this project's Vue 3.5.44.

## Arrays

Vue 3 tracks array changes through the proxy, so the things that needed `Vue.set` in Vue 2 work directly:

```ts
const rows = ref<Row[]>([])

rows.value.push(row) // tracked
rows.value[0] = row // tracked
rows.value.length = 0 // tracked
```

What is not tracked is a change Vue cannot see:

```ts
const plain = rows.value.slice()
const top = { ...rows.value[0] }

top.title = 'Dune' // a plain object, so the template does not update
```

Spreading an object out of a reactive array gives a plain object. It is the right thing to do when you want a
snapshot, and the wrong thing when you meant to keep editing the row.

## Map and Set

```ts
const seen = reactive(new Map<string, number>())

seen.set('dune', 1) // tracked
seen.get('dune') // tracked
seen.size // tracked
```

Vue wraps `Map`, `Set`, `WeakMap` and `WeakSet` with instrumented methods, so the collection API works as
documented and stays reactive. A `ref` around a `Map` works as well and needs `.value` at each call.

## Deep and shallow

```ts
const rows = shallowRef<readonly Row[]>([])
const rows = ref<Row[]>([])
```

A `ref` on an array makes every element reactive as well as the array itself. For a report with a thousand rows
that is a thousand proxies to create, and the page only ever reads the top level. `shallowRef` tracks the
reference, so a new array renders and a change inside an element does not:

```ts
rows.value = await loadRows() // renders
rows.value = rows.value.map((row) => ({ ...row, flagged: true })) // renders

rows.value[0].flagged = true // writes, and does not render
triggerRef(rows) // renders, and says out loud that you know
```

The types in this project are `readonly` by habit, and that last write is where the habit helps:
`shallowRef<readonly Row[]>` refuses it at compile time with

```text
Index signature in type 'readonly Row[]' only permits reading.
```

That is a compile error rather than a page that quietly stops updating, which is the right way round.

The signature of `shallowRef<T>` is a hint worth reading: `T` is not made reactive, so `shallowRef<readonly Row[]>`
describes an array that Vue will not walk into. `markRaw` marks one value the same way, which is what to do with a
third party instance or a class with methods.

The trade is stated in one line: deep reactivity costs work proportional to the size of the data, and shallow
reactivity costs you the ability to change a value in place. For a list that is replaced wholesale, shallow is the
cheaper and clearer choice, and the performance chapter measures the difference.

## Immutability, when it helps

```ts
books.value = [...books.value, book]
books.value = books.value.filter((row) => row.id !== id)
```

Producing a new array or object instead of editing one makes the change visible in a diff, makes the value safe
to hand to a computed, and makes a component's props predictable. It costs an allocation per change, which for
anything smaller than a few thousand rows is nothing worth optimising. I write new values for arrays and objects
in state, and edit in place for a `shallowRef` whose contents are replaced in bulk anyway.

## Check yourself

Write a component with a `shallowRef<Row[]>` and two buttons, one that replaces the array and one that edits
`rows.value[0]`. Watch which one renders, then add `triggerRef` to the second and explain what it does to the
tracking rather than to the data.
