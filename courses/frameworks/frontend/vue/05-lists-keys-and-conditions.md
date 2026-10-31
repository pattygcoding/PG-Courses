---
title: Lists, keys and conditions
summary: A key is identity, a computed list is derived rather than stored, and the empty state belongs next to the list.
chapter: Getting started
minutes: 13
status: draft
---

## The list the catalogue renders

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import BookCard from '../components/BookCard.vue'
import { useBooks } from '../composables/useBooks'

const { books, loading, error, reload } = useBooks()
const term = ref('')
const genre = ref('all')

const genres = computed(() => [...new Set(books.value.map((book) => book.genre))].sort())

const visible = computed(() => {
  const needle = term.value.trim().toLowerCase()

  return books.value.filter((book) => {
    const inGenre = genre.value === 'all' || book.genre === genre.value
    const inText =
      needle === '' ||
      book.title.toLowerCase().includes(needle) ||
      book.author.toLowerCase().includes(needle)

    return inGenre && inText
  })
})
</script>

<template>
  <section>
    <p v-if="loading" role="status">Loading the catalogue...</p>

    <p v-else-if="error" role="alert">
      {{ error }}
      <button type="button" @click="reload">Try again</button>
    </p>

    <template v-else>
      <p>{{ visible.length }} of {{ books.length }} books</p>

      <ul class="books">
        <BookCard
          v-for="book in visible"
          :key="book.id"
          :book="book"
          :highlighted="book.id === selected"
          @chosen="selected = $event"
        />

        <li v-if="visible.length === 0">No book matches "{{ query }}".</li>
      </ul>
    </template>
  </section>
</template>
```

Three patterns are worth naming, because they repeat in every list in every application:

- **The list is derived.** `visible` is a computed value built from `books`, the term and the genre. A
  `filteredBooks` ref kept in step with three other values would be a fourth thing to keep correct, and the bug
  when it drifts is a list that does not match the box.
- **The states are exclusive.** Loading, then failure, then the list, in the order a person meets them.
- **The empty state sits next to the list**, so the case is handled where the list is written rather than when
  somebody notices a blank box.

## A key is identity

```vue
<BookCard v-for="book in visible" :key="book.id" :book="book" />
```

Vue compares the previous list with the new one and needs to know which item is which. The key answers that, and
it is read during the comparison rather than passed to the component.

```vue
<li v-for="(book, index) in books" :key="index">{{ book.title }}</li>
```

An index is a position rather than an identity. Insert a book at the front of that list and every remaining item
has a new index, so Vue matches item 1 with what used to be item 2 and patches the wrong DOM. Any state inside
those items, such as a focus, an input value or an open menu, stays with the position rather than the book.

Index keys are acceptable in exactly one case: a list that is never reordered, never filtered and never has an
item removed. A list of static options qualifies. Everything else has an id.

## Conditions inside a list

```vue
<li v-for="line in report.genres" :key="line.genre" v-memo="[line.loans, line.waiting]">
  <th scope="row">{{ genreLabel(line.genre) }}</th>
  <td>{{ line.loans }}</td>
  <td>{{ line.waiting }}</td>
</li>
```

`v-memo` takes an array of values and skips updating the element when all of them are unchanged. It is the
compiler-supported version of "this row cannot have changed", and the performance chapter measures when it earns
its place. It is only useful inside a `v-for` on a large list, where the update work per row adds up.

## Filtering without a new array

```ts
const visible = computed(() => books.value.filter((book) => matches(book)))
```

`filter`, `map`, `slice` and the spread operator all return new values. That matters because Vue compares an array
by identity when it decides whether a computed result changed, so a `sort` that sorted in place would leave the
computed with the same reference and no update. The catalogue's `[...new Set(...)]` is the same idea: build a new
array, leave the input alone.

```ts
copy.sort((left, right) => right.loans - left.loans)
```

The reports view copies before sorting for that reason. `readonly` types in this project make the mistake a
compile error rather than a silent one.

## Ranges and objects

```vue
<span v-for="n in 5" :key="n">{{ n }}</span>
```

```vue
<tr v-for="(value, key) in summary" :key="key">
  <th scope="row">{{ key }}</th>
  <td>{{ value }}</td>
</tr>
```

A number gives a range from one, an array gives items, and an object iterates its keys. The order of an object's
keys is the order JavaScript gives, which is insertion order for strings, so an object is a usable summary but a
poor data structure to rely on.

## Check yourself

Add a sort control to the catalogue and work out why the sort has to produce a new array. Then give the list an
index key, put a text input inside each row, sort the list, and watch what happens to what you typed.
