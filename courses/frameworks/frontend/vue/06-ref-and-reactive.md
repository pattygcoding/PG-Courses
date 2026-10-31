---
title: ref and reactive
summary: Two ways to make a value reactive, why one needs .value, and the unwrapping that stops being magic.
chapter: Reactivity
minutes: 14
status: draft
---

## ref

```ts
import { ref } from 'vue'

const term = ref('')
const count = ref(0)
const books = ref<readonly Book[]>([])

term.value = 'dune'
count.value += 1
books.value = [...books.value, book]
```

`ref` wraps a value in an object with one reactive property. Two rules follow from that shape:

- In a script block you read and write `.value`.
- In a template you do not, because the compiler unwraps it for you.

The reason for the wrapper is JavaScript rather than Vue's taste. A primitive has no identity to hook: assigning
a new string to a variable cannot notify anything, because there is no object to intercept. Wrapping it gives Vue
a property to define a getter and a setter on, which is how it registers the read and triggers the write.

```ts
const objects = ref({ title: 'Dune' })

objects.value.title = 'Dune, deluxe edition' // still reactive, still rendered
```

For an object, `ref` makes the value deeply reactive: a change to a nested property is tracked, and a template
reading `objects.value.title` updates. `shallowRef` is the opt-out, and it comes later in this chapter.

## reactive

```ts
import { reactive } from 'vue'

const session = reactive({
  member: null as string | null,
  signedInAt: 0,
})

session.member = 'Ada Lovelace'
```

`reactive` returns a proxy around an object, with no `.value` anywhere. Two restrictions come with it:

- It only works on objects, arrays, `Map` and `Set`. `reactive(0)` does nothing useful and warns.
- It has to be the same proxy that gets read. Reassigning the whole object breaks the link:

```ts
let state = reactive({ count: 0 })
state = { count: 1 } // a plain object now, and nothing is tracked
```

Both forms are correct, and mixing them in one codebase is what makes people guess. The convention this project
follows: `ref` everywhere, including for objects, because `.value` is a visible reminder that a value is
reactive. `reactive` reads better for a fixed shape that is never reassigned, which is the case for a Pinia store
and rarely anywhere else.

## Losing the link

The trap that catches everybody once:

```ts
const book = ref({ title: 'Dune', copies: 3 })

const { title, copies } = book.value // two plain strings, and no longer reactive

const books = ref([{ title: 'Dune' }])
const first = books.value[0] // a proxy, still reactive
```

Destructuring reads a property once and stores the result. If the value is an object, what you stored is still a
reactive proxy, so those keep working. If it is a primitive, you stored a copy, and the template that reads it
will not update. `toRef` and `toRefs` exist for that case:

```ts
const { title } = toRefs(book.value)

title.value // read it as a ref, and it stays in step
```

The same trap appears when a prop is destructured in a component, which is what the props page covers.

## Reading reactivity on purpose

```ts
const term = ref('')

const uppercase = ref(term.value.toUpperCase()) // a snapshot, computed once
```

Setup runs once, so that line computes one value and never looks at `term` again. Anything derived from a
reactive value has to be either a computed, a function called from the template, or a watcher. The next page is
the computed, which is the right answer most of the time:

```ts
const uppercase = computed(() => term.value.toUpperCase())
```

## shallowRef and markRaw

```ts
const rows = shallowRef<readonly Row[]>([])

rows.value = await loadRows() // tracked: the array itself changed
rows.value.push(row) // not tracked: the contents changed
```

`shallowRef` tracks the reference rather than the contents. Two situations want it:

- A large array that is replaced wholesale, where making every element deeply reactive costs more than it saves.
  A report with a thousand rows and a select that rebuilds the array is the case in this project's reports view.
- A value that should never be made reactive at all, because it is a class instance with behaviour attached, or
  a third party object whose internals should not be proxied. `markRaw` marks one value for that.

The cost is that a change inside the value does not render, and the fix is to replace the value or to call
`triggerRef(rows)` to say it changed. That is a deliberate trade, and the performance chapter measures it.

## Check yourself

Write a component with a `ref` holding an object, change a nested property, and confirm the page updates. Then
destructure one of the properties into a `const`, change the object again, and explain which of the two the page
still shows and why.
