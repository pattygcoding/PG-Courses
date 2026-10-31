---
title: Provide, inject and composables
summary: Passing something down a tree without threading it through every layer, and the composables that carry behaviour.
chapter: Components
minutes: 14
status: draft
---

## Provide and inject

```ts
import { inject, provide } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import type { Book } from './book'

/**
 * The book a page is about, shared with anything rendered inside it. A symbol
 * key means two libraries cannot collide on a string key by accident.
 */
const bookKey: InjectionKey<Ref<Book | null>> = Symbol('current-book')

export function provideBook(book: Ref<Book | null>): void {
  provide(bookKey, book)
}

export function useCurrentBook(): Ref<Book | null> {
  const book = inject(bookKey, null)

  if (book === null) {
    throw new Error('useCurrentBook must be used inside a component that provides a book')
  }

  return book
}
```

```ts
// in the component that loaded the book
provideBook(book)
```

```ts
// in a component any depth below it
const book = useCurrentBook()
```

Four decisions are in those twenty lines, and each one is worth copying:

- **A symbol key**, typed with `InjectionKey<Ref<Book | null>>`. A string key is one typo away from a silent
  `undefined`, and two libraries that both use `'book'` collide.
- **A wrapper on each side.** `provideBook` and `useCurrentBook` are the only names a component imports, so the
  key never leaks into application code.
- **A throw rather than a default.** A component that needs a book and has none is a programming error, and the
  message says which. `inject(bookKey, null)` still passes a default, because the throw reads better than
  `undefined` travelling into a template.
- **A ref, not a value.** The provider's `ref` is passed down as an object, so an update to the book updates every
  reader rather than the copy taken at inject time.

That last point is the difference between provide and a prop: a prop is one hop down and one version of the value,
while a provided ref is a live link across any number of levels.

## The failure, and the test for it

```text
Error: useCurrentBook must be used inside a component that provides a book
```

That error arrives while the component is being set up, so a component with a missing provider fails loudly rather
than rendering an empty panel. The test is two lines:

```ts
it('refuses to guess when nothing provides a book', () => {
  // A missing provider throws while the component is being set up, which is
  // the loudest failure available and the one a developer wants.
  expect(() => mount(LoanHint)).toThrow(
    'useCurrentBook must be used inside a component that provides a book',
  )
})
```

`mount` throws synchronously because the error happens in setup. An error thrown later, in a render or a watcher,
arrives at the application's `errorHandler` instead, which is the difference the lifecycle page covers.

## A default, when the dependency is optional

```ts
const theme = inject(themeKey, 'light')
```

An optional dependency takes a default and needs no wrapper that throws. The rule I use: a component that cannot
function without the value throws; a component with a sensible fallback takes one.

## Keeping the provided value honest

```ts
import { readonly } from 'vue'

provide(sessionKey, {
  member: readonly(member),
  signIn,
  signOut,
})
```

`readonly` hands readers a proxy that warns when they try to write. It does not stop a child from mutating an
object it was given, and it does make the intent clear at the point of use: the provider owns the state, and the
children call the functions it provided.

## Composables are the other half

```ts
export function useBooks() {
  const books = shallowRef<readonly Book[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const attempt = ref(0)

  let controller: AbortController | undefined

  watch(
    attempt,
    () => {
      controller?.abort()
      const current = new AbortController()
      controller = current

      loading.value = true
      error.value = null

      fetchBooks(current.signal)
        .then((next) => {
          books.value = next
        })
        .catch((failure: unknown) => {
          if (current.signal.aborted) {
            return
          }

          error.value =
            failure instanceof Error ? failure.message : 'The catalogue could not be read.'
        })
        .finally(() => {
          if (!current.signal.aborted) {
            loading.value = false
          }
        })
    },
    { immediate: true },
  )

  onScopeDispose(() => controller?.abort())

  return {
    books,
    loading,
    error,
    reload: () => {
      attempt.value += 1
    },
  }
}
```

A composable is a function that uses Vue's reactivity and returns state or behaviour. This one owns a request, the
three states that go with it, cancellation and a way to retry. The view that calls it renders four things:

```ts
const { books, loading, error, reload } = useBooks()
```

Six decisions in that function, and every one came from a failure:

- **`shallowRef` for the list**, because a catalogue replaces the array rather than editing inside it, so the
  elements have no behaviour worth tracking.
- **One controller per attempt**, reassigned before the request starts, so a slow first request cannot land after
  a fast second one.
- **The abort check in both the catch and the finally**, because an aborted request is not a failure to show
  anybody, and clearing `loading` for a superseded request would hide the state of the live one.
- **`{ immediate: true }`** so the first load happens without waiting for a change.
- **`onScopeDispose`** rather than `onUnmounted`, which works whether the composable was called from a component
  or from an `effectScope` in a test.
- **`reload` as a function** rather than the `attempt` ref, so the caller cannot set it to a negative number and
  the composable can change how it retries later.

## Naming what comes back

```ts
const { books, loading, error, reload } = useBooks()   // an object
const { value: query, pending } = useDebouncedRef(term, 300)  // two refs, renamed
```

An object with named fields reads better once a composable returns more than two things, and it lets the
composable add a field without changing every caller. `useDebouncedRef` returns two refs, and the caller renames
one of them on the way in, which is what the destructuring form is for.

A composable that returns a tuple of three or more invites `const [a, b, c] = useThing()` and a reader who has to
look up which is which. Named fields, or two composables, are clearer.

## Which one, when

| Situation | Tool |
| --- | --- |
| a value many components need, owned by an ancestor | provide and inject |
| behaviour a component needs: fetch, timers, storage, media | a composable |
| data going one level down | a prop |
| data going one level up | an emit |

The catalogue uses all four: the book is provided by the panel and injected by the hint, `useBooks` and
`useLocalStorage` carry behaviour, the cards take props, and the waiting list emits a number upwards.

## Testing a composable on its own

```ts
it('passes a value on once the changes stop', async () => {
  vi.useFakeTimers()

  const source = ref('')
  const { value, pending } = effectScope().run(() => useDebouncedRef(source, 300))!

  source.value = 'du'
  await nextTick()

  expect(pending.value).toBe(true)
  expect(value.value).toBe('')

  vi.advanceTimersByTime(300)

  expect(value.value).toBe('du')
  expect(pending.value).toBe(false)
})
```

`effectScope().run(...)` gives the composable the scope it expects without mounting a component, which is how a
composable is tested on its own. The `await nextTick()` is there because a `watch` callback runs on the next tick
rather than immediately, and the testing chapter comes back to both.

## Check yourself

Write a `useOnline` composable that reports whether the browser is online, with a listener and a cleanup, and use
it in two components. Then wrap the same value in a provide so a page shares one listener rather than starting one
per component, and explain which of the two you would ship.
