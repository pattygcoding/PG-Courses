---
title: Keeping updates cheap
summary: shallowRef for data you replace, v-once and v-memo for what cannot change, and a key used as a deliberate remount.
chapter: Performance
minutes: 13
status: draft
---

## shallowRef for data that is replaced

```ts
const books = shallowRef<readonly Book[]>([])
...
books.value = next
```

`shallowRef` tracks the reference rather than the contents, so Vue does not walk into the array and make a proxy per
element. The catalogue uses it because the list arrives whole and leaves whole: the composable assigns `books.value`
and nothing ever edits a book in place. For a few dozen books the difference is not measurable, and the reason to
reach for it is a report with thousands of rows, where the proxies are created on every load and read once.

`triggerRef` is the companion for a value that is edited in place:

```ts
rows.value[0].flagged = true // writes, and does not render
triggerRef(rows) // renders, and says out loud that you know
```

Calling `triggerRef` is a way of telling Vue that a change it could not see has happened. It is a deliberate hole in
the reactivity system, and the reason the project's types are `readonly` is to make filling it in a decision rather
than an accident:

```text
Index signature in type 'readonly Row[]' only permits reading.
```

## v-once for what cannot change

```vue
<p v-once>{{ staticText }}</p>
```

`v-once` renders the element and its children once, and every later update skips the whole subtree. It is the right
tool for content built at mount and never touched again: a table of contents, a rendered Markdown block, a
copyright line with a year in it.

```vue
<template v-for="book in visible" :key="book.id">
  <BookCard :book="book" />
</template>
```

The cost is stated in the name: a `v-once` block that should have changed does not, and the bug looks like a stale
page. It is worth it for a subtree that is genuinely static and measurably expensive, and it is a coin flip for
anything that might later take a prop.

## v-memo for a row that cannot have changed

```vue
<tr v-for="line in report.genres" :key="line.genre" v-memo="[line.loans, line.waiting]">
  <th scope="row">{{ genreLabel(line.genre) }}</th>
  <td>{{ line.loans }}</td>
  <td>{{ line.waiting }}</td>
</tr>
```

`v-memo` takes an array of values and skips updating the element when every one of them is equal to the previous
value. It only works inside a `v-for`, and it is the escape hatch for a long list where each row is expensive to
patch and most rows do not change:

- A table where one row is edited and the other two thousand are not.
- A list where a filter changes a few rows and the rest keep their data.
- A row whose template is genuinely heavy: several conditional blocks, nested components, formatted numbers.

```vue
<tr v-for="line in report.genres" :key="line.genre" v-memo="[line.loans, line.waiting]">
```

The array has to list every value the row reads. A missing entry means the row keeps stale content, and no warning
tells you: the memo is a promise from the developer to the compiler, and it is checked by reading the template
rather than by tooling.

For a list of ten items, `v-memo` is noise. For ten thousand, it is the difference between a scroll that stutters and
one that does not, which is why the reports page keeps it and the catalogue does not.

## A key as a deliberate remount

```vue
<BookPanel :key="book.id" :id="book.id" />
```

Changing a component's `key` unmounts the old instance and mounts a new one. That is the intended behaviour of a key,
and it is also the tool for a component whose state is tied to its props too tightly to reinitialise on a prop change:
a rich text editor, a chart with its own canvas, a form loaded from a record. The trade is that everything in the old
instance is destroyed, including scroll position, focus and any cache it holds.

```vue
<WaitingPanel v-if="genre !== 'all'" :key="genre" :genre="genre" />
```

A key on a conditional component gets both behaviours at once: the component exists only for a genre filter, and it
starts fresh when the genre changes. Without the key, Vue reuses the instance and the panel would keep the previous
genre's count while the new request was in flight.

## The list cost, named

| Cost | Fix |
| --- | --- |
| every row re-patching on a change to one | a stable key, then `v-memo` on the values the row reads |
| a row that recreates its props each render | pass the object itself, not a spread of it |
| a filter that re-sorts on every keystroke | a computed, so the sort runs when its inputs change |
| ten thousand rows in the DOM at once | paging, or a virtual list that renders what fits |
| a slot passed to every row | pass the content as props when it does not need the parent's scope |

The last two are the ones worth measuring before reaching for a tool. A virtual list is a dependency and a different
rendering model, and paging twenty rows at a time is a backend query and a UI decision rather than a performance
trick.

## Check yourself

Build a table of five hundred rows with one input above it, and measure how many rows render when you type. Then add
`v-memo` with the value the row reads, measure again, and write down which of the two numbers changed and why the
other one did not.
