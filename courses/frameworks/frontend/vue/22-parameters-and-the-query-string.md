---
title: Parameters and the query string
summary: Route params as props, the query string as state, and the delay that keeps the history clean.
chapter: Routing
minutes: 13
status: draft
---

## A param, as a prop

```ts
{
  path: '/books/:id',
  name: 'book',
  component: () => import('../views/BookDetailView.vue'),
  // The route parameter arrives as a prop, so the view takes what it needs.
  props: true,
  meta: { title: 'Book - Northside Library' },
},
```

```vue
<script setup lang="ts">
import BookPanel from '../components/BookPanel.vue'

defineProps<{
  readonly id: string
}>()
</script>

<template>
  <Suspense>
    <template #default>
      <BookPanel :id="id" />
    </template>
    <template #fallback>
      <p role="status">Loading the book...</p>
    </template>
  </Suspense>
</template>
```

`props: true` turns the route's params into component props, which makes the view a component with a declared
input rather than one that reaches for a global. Three consequences:

- The component is testable by mounting it with `props: { id: 'dune' }`, with no router in the test.
- The compiler checks the prop, so a view that expects an `id` and a route that does not provide one is caught.
- The route stays the only place that knows about URLs.

```ts
const route = useRoute()
route.params.id // "dune", and a string or an array of strings
```

`useRoute` is still there for the cases a prop does not cover: reading the current `fullPath` for a "back to where
I came from" link, or watching the params in a component that stays mounted across a param change.

## The query string as state

```ts
const route = useRoute()
const router = useRouter()

const term = ref(typeof route.query.q === 'string' ? route.query.q : '')
const genre = ref(typeof route.query.genre === 'string' ? route.query.genre : 'all')
```

Reading the query string into a ref seeds the controls from the URL, so a link to `/?genre=poetry` opens with the
select already set and the list already filtered. `route.query.q` is typed as `string | (string | null)[] | null`,
which is why the `typeof` check is there rather than a cast: a query parameter can appear twice.

Writing it back is the interesting part:

```ts
watch(genre, (next) => {
  void router.replace({ query: { ...route.query, genre: next === 'all' ? undefined : next } })
})
```

Three decisions in one line:

- **`{ ...route.query }`** keeps the other parameters. A genre change must not drop the search term.
- **`undefined` removes the key.** `?genre=all` and no parameter mean the same thing, and one of them is a URL worth
  copying.
- **`replace`** overwrites the current entry instead of pushing a new one, so the back button is not a list of
  select changes.

## The delay

```ts
const { value: query, pending } = useDebouncedRef(term, 300)

watch(query, (next) => {
  void router.replace({ query: { ...route.query, q: next === '' ? undefined : next } })
})
```

A search box writes a URL per keystroke without that delay: eight letters, eight history entries, and eight
`replace` calls that re-render the route. The composable passes the value on 300 ms after the typing stops, and
`pending` is what puts the word "filtering" next to the box while a write is waiting.

The typed value and the debounced value are two refs on purpose. The input binds to the first, so the characters
appear immediately, and everything downstream reads the second. That is the same split React's `useDeferredValue`
makes, written by hand in fifteen lines.

## The filters read from the URL, the list from the data

```ts
const visible = computed(() => {
  const needle = query.value.trim().toLowerCase()

  return books.value.filter((book) => {
    const inGenre = genre.value === 'all' || book.genre === genre.value
    const inText =
      needle === '' ||
      book.title.toLowerCase().includes(needle) ||
      book.author.toLowerCase().includes(needle)

    return inGenre && inText
  })
})
```

The URL is the source of truth for the filter, and the array is the source of truth for the data. Neither is
copied into the other, so there is no state that can disagree with the URL. Reloading the page restores the view
because the URL was the view all along, and the browser verified that:

```text
url: http://localhost:4290/?q=dune
rows: ["Dune"]
```

## What belongs in the URL

| Belongs | Does not belong |
| --- | --- |
| a filter, a sort, a page number | a half typed form |
| a selected tab or a panel | a password or a token |
| a search term worth sharing | a value that changes per keystroke without debounce |
| an id of the record on screen | state that only one component reads |

The test for the last row is the back button. If stepping back through a value is useful, it belongs in the URL; if
it would be noise, the value belongs in a ref.

## Check yourself

Add a `page` parameter to the catalogue, default it to 1, and keep it while the search term changes. Then make the
back button walk through two genre changes and not through the typing, and write down which of the two writes
pushed a history entry.
