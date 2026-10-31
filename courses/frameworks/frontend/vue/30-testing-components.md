---
title: Testing components
summary: mount, the props it takes, the events it reports, the slots it renders, and the plugins it needs.
chapter: Testing
minutes: 14
status: draft
---

## A component and its props

```ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import BookCard from '../BookCard.vue'
import type { Book } from '../../library/book'

const dune: Book = {
  id: 'dune',
  title: 'Dune',
  author: 'Frank Herbert',
  genre: 'science-fiction',
  copies: 3,
}

function router() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/books/:id', name: 'book', component: { template: '<div />' } },
    ],
  })
}

it('renders the book and links to its page', async () => {
  const wrapper = mount(BookCard, {
    props: { book: dune },
    global: { plugins: [router()] },
  })

  const link = wrapper.get('a')
  expect(link.text()).toContain('Dune')
  expect(link.attributes('href')).toBe('/books/dune')
  expect(wrapper.text()).toContain('Frank Herbert')
  expect(wrapper.text()).toContain('Science fiction')
})
```

`mount` takes the component, its props, and a `global` block for the plugins the component needs. Four things to note:

- **`wrapper.get('a')`** finds one element and throws if there is none or several. `find` returns a wrapper that may be
  empty, which is what to use when asserting something is absent.
- **`link.attributes('href')`** reads the rendered attribute, so the assertion is on the routing that came out rather
  than on a function call.
- **`wrapper.text()`** is the concatenated text with the whitespace normalised, which is the fastest way to ask "does
  the page say this".
- **A router in `global.plugins`** is needed because `BookCard` renders a `RouterLink`. `createMemoryHistory` is the
  one to reach for in a test: it does not touch the address bar, and two stub routes are enough for a link's `href` to
  resolve.

## Events

```ts
it('reports the choice to the parent', async () => {
  const wrapper = mount(BookCard, {
    props: { book: dune },
    global: { plugins: [router()] },
  })

  await wrapper.get('a').trigger('click')

  expect(wrapper.emitted('chosen')).toEqual([['dune']])
})
```

```ts
expect(wrapper.emitted('joined')).toEqual([[9]])
```

`emitted(name)` returns an array of payload arrays, one per emission, and `undefined` when the event never fired. The
double brackets are easy to read wrong: `[['dune']]` is one emission of one argument. Asserting on the whole array is
worth it because it fails when an event fires twice, which a count would hide.

## Slots, including the fallback

```ts
it('falls back to its own footer when the caller gives none', () => {
  const wrapper = mount(BookCard, { props: { book: dune }, global: { plugins: [router()] } })

  expect(wrapper.text()).toContain('3 on the shelf')
})

it('gives the footer slot the copies to render', () => {
  const wrapper = mount(BookCard, {
    props: { book: dune },
    global: { plugins: [router()] },
    slots: {
      footer: (props: { copies: number }) => h('em', `${props.copies} left on the shelf`),
    },
  })

  expect(wrapper.get('em').text()).toBe('3 left on the shelf')
})
```

A slot is passed as a function when it takes slot props, and the function's argument is the object the component bound
to the slot. The first test is the one people forget: the fallback is a second rendering path and it deserves its own
assertion.

## Interactions

```ts
await wrapper.get('#search').setValue('edda') // types into an input and fires input
await wrapper.get('#genre').setValue('poetry') // selects an option and fires change
await wrapper.get('form').trigger('submit') // fires submit
await wrapper.get('button').trigger('click')
```

`setValue` on an input sets the value and dispatches the event Vue listens for, which is what makes `v-model` update.
On a select it picks the option whose value matches. `trigger` fires one event and returns a promise that resolves
after the DOM has updated, so a test that awaits it sees the new DOM in the next assertion.

## Wrapping a component in a host

```ts
const Host = defineComponent({
  components: { WaitingPanel },
  template: '<Suspense><WaitingPanel genre="poetry" /></Suspense>',
})

const wrapper = mount(Host)
await flushPromises()

expect(wrapper.text()).toContain('2 borrowers are waiting')
```

An async component needs a `<Suspense>` above it, which a test cannot provide by mounting the component directly. A
tiny host component with an inline template is the answer, and it is also how a component that needs a provider or a
router view gets one:

| The component needs | The host provides |
| --- | --- |
| `Suspense` for a top-level await | `<Suspense><Child /></Suspense>` |
| a `provide` from an ancestor | a `setup` that calls `provideBook(book)` and returns a render function |
| a router view | `global.plugins: [router]` and a route pointing at the component |

That last row is the one to avoid when it can be: a view tested through a route is a test of the route as well, and
the guard tests in the routing page are where that belongs.

## Shallow and stubs

```ts
const wrapper = mount(CatalogueView, {
  global: { stubs: { BookCard: true } },
})

const wrapper = shallowMount(CatalogueView)
```

`stubs` replaces one child with a placeholder, and `shallowMount` replaces all of them. Both are for checking that a
child was given the right props without rendering it, and both hide the behaviour you would usually want to assert.

I use neither in this project. The components are small, the tests are fast, and a test that renders the real child
catches a broken prop name that a stub would not. The case for stubbing is a child with a heavy dependency such as a
canvas or a date picker, and it is worth reaching for exactly there.

## What the tests cost

```text
Test Files  8 passed (8)
     Tests  29 passed (29)
  Duration  1.33s
```

Eight files, twenty-nine tests and one and a third seconds, which includes the router test file that imports the whole
application. That is fast enough to run on every save, and it is the reason the suite can afford to render real
children rather than stubbing them.

## Check yourself

Write tests for `WaitingList` that cover the validation message and the event it emits, then a test for `AppField`
with no slot passed so the fallback input renders. Run the file after each one and read the failure rather than
guessing at it.
