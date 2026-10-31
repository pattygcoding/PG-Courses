---
title: computed
summary: A cached value that follows what it read, and the measurement that shows it is not recalculated for nothing.
chapter: Reactivity
minutes: 13
status: draft
---

## A value derived from other values

```ts
const genres = computed(() => [...new Set(books.value.map((book) => book.genre))].sort())
```

```ts
const visible = computed(() => {
  const needle = term.value.trim().toLowerCase()

  return books.value.filter((book) => {
    const inGenre = genre.value === 'all' || book.genre === genre.value
    const inText = needle === '' || book.title.toLowerCase().includes(needle)

    return inGenre && inText
  })
})
```

A computed reads reactive values, and every read is registered as a dependency. When one of them changes, the
computed is marked stale and recalculated the next time somebody reads it. Nothing else calls it: the template
reads it, so the template updates.

Three rules make a computed behave:

- **Return a value.** No side effects, no writes to other state, nothing that changes the world. A computed that
  writes is a bug that shows up as an unexplained update loop.
- **Read reactive values.** A plain object read at setup time is a snapshot, and the computed will never update.
- **Do not store a copy.** A `ref` that a watcher writes to is the manual version of what a computed does, and it
  is the version that drifts.

## The caching, measured

The probe in this project counts evaluations, and the catalogue's `genres` computed calls it:

```ts
const genres = computed(() => {
  countGenreEvaluation()
  return [...new Set(books.value.map((book) => book.genre))].sort()
})
```

```vue
<p class="renders">genres computed {{ genreEvaluationCount() }}</p>
```

Typing four characters into the search box, with the value read off the running page:

| | the line on the page |
| --- | --- |
| after the books arrived | `genres computed 2` |
| after four keystrokes | `genres computed 2` |

Two evaluations in total: one for the first render, when the list was empty, and one when the books arrived and
`books.value` changed. The four keystrokes changed `term`, which `genres` never read, so it was read from cache
each time. That is the difference between a computed and a method: a method in the template runs on every render,
a computed runs when its inputs change.

## A computed in a method's clothing

```vue
<p>{{ genreLabel(book.genre) }}</p>
```

`genreLabel` is a plain function called from the template, and it runs on every render of that component. For a
string transformation that is the right trade: the code reads as a function call, the work is microseconds, and a
computed per row would be a cache per row to maintain.

```ts
const label = computed(() => genreLabel(book.genre))
```

The computed version earns its keep when the work is genuinely expensive, such as sorting, formatting a large
dataset or walking a tree. Below that, a function call is clearer and fast enough.

## Writable computed

```ts
const filter = computed({
  get: () => genre.value,
  set: (next: string) => {
    genre.value = next
    page.value = 1
  },
})
```

```vue
<select v-model="filter">...</select>
```

A writable computed is the answer when a control has to write one value and also reset another. `v-model` on a
computed calls `get` to render and `set` to write, which is why the setter can do the extra work. The alternative
is a handler, and the trade is that the "filter changed" rule lives with the filter rather than in the template.

## Computed versus watch

```ts
// a value
const visible = computed(() => books.value.filter(matches))

// a reaction
watch(term, (next) => {
  router.replace({ query: { q: next === '' ? undefined : next } })
})
```

A computed answers "what is the value now". A watcher answers "something changed, do this". If you can write the
answer as an expression over reactive values, it is a computed. If the work is a side effect, such as writing to
the URL, calling an API or starting a timer, it is a watcher.

The mistake the linter will not catch is a watcher that sets a ref used only in the template. That is a computed
written the long way round, with an extra render in the middle.

## Check yourself

Add a `sorted` computed to the catalogue that sorts the visible list by title, and put a counter inside it like
the probe above. Type four characters, then change the sort control, and read both counts. Then explain which of
the two inputs each count followed.
