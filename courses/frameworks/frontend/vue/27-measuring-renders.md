---
title: Measuring renders
summary: A probe in the component, the numbers it produced, and the line between a cached computed and a child that re-rendered anyway.
chapter: Performance
minutes: 14
status: draft
---

## A probe, kept honest

```ts
let cardRenders = 0
let genreEvaluations = 0

/**
 * Render and evaluation counts. A measurement aid: they are here so the
 * performance pages can show numbers rather than claims, and they come out
 * again afterwards.
 */
export function countCardRender(): void {
  cardRenders += 1
}

export function cardRenderCount(): number {
  return cardRenders
}

export function countGenreEvaluation(): void {
  genreEvaluations += 1
}

export function genreEvaluationCount(): number {
  return genreEvaluations
}
```

```vue
<span class="renders">card renders {{ cardRenderCount() }}</span>
```

```ts
const genres = computed(() => {
  countGenreEvaluation()
  return [...new Set(books.value.map((book) => book.genre))].sort()
})
```

Writing to a module variable from inside a render is exactly what the reactivity chapter tells you not to do, which
is why this file is labelled as a measurement and comes out again once it has answered the question. The alternative
is an opinion about which component re-renders too often, and an opinion is worth less than a number.

Three ways to show the number, in increasing order of setup:

| Where it goes | How it gets there |
| --- | --- |
| a `<span>` in the component | visible in the page, and readable by a test |
| `console.log` in the render | visible in the browser console, and noisy |
| a `window` property | readable from the console or from browser automation |

I read both numbers out of the page with a browser automation script while the page was running, which is what makes
the tables below measurements rather than estimates.

## The computed is cached

Typing four characters into the catalogue's search box, with the value read off the running page:

| | the line on the page |
| --- | --- |
| after the books arrived | `genres computed 2` |
| after four keystrokes | `genres computed 2` |

Two evaluations in total: one for the first render, when the list was empty, and one when `books.value` changed to
the loaded array. The four keystrokes changed `term`, which `genres` never read, so each render read a cached value.

The contrast with a method is the point:

```vue
<p>{{ genreLabel(book.genre) }}</p>
```

A function called from a template runs on every render of that component, because nothing is tracked inside it. For
a string transformation that is fine and clearer. For a sort of a thousand rows it is the difference between a
responsive page and a stalled one, and the fix is a computed.

## A child re-renders when its parent hands it a slot

The catalogue's cards receive the visible array and a `highlighted` flag, and one more thing: a `#footer` slot.

```vue
<BookCard
  v-for="book in visible"
  :key="book.id"
  :book="book"
  :highlighted="book.id === selected"
  @chosen="selected = $event"
>
  <template #footer="{ copies }">
    <span class="copies">{{ copies }} on the shelf</span>
    <span v-if="book.id === selected" class="chosen"> (last opened)</span>
  </template>
</BookCard>
```

Two runs of the same measurement, four keystrokes each, one difference between them:

| The card | Its render count after four keystrokes |
| --- | --- |
| with the `#footer` slot passed in | 4 |
| with no slot passed in | 1, unchanged from the first render |

The parent rendered four times in both runs. In the first, each render came with a new slot function, so the child
rendered again with it. In the second, the child's props were the same array element it already had, and Vue skipped
it.

That is the props-unchanged optimisation, and it is why a Vue component often needs no `memo` equivalent at all.
Three things switch it off:

- **Slots.** A component that receives slot content re-renders with its parent, because the parent's content could
  have changed.
- **A new object or array as a prop.** `:book="{ ...book }"` is a new value every render, so the comparison fails.
- **A dynamic component, or a `v-bind` spread of props.** Both say "anything could have changed", which is what the
  `NEEDS_PATCH` flag on the parent's vnode means.

## What DevTools adds

- **Components** shows the tree with each component's props, state and provided values. Editing a value there changes
  it in the running page, which is the fastest way to answer "does this render when that value changes".
- **Timeline** records every reactive event with the value and the component it reached, which is how a change that
  re-renders half the page becomes a list of suspects.

The browser's performance panel is the other half, and the two answer different questions: the performance panel
says how long the work took, and the devtools say which component did it.

## What to measure first

1. The build output, for what the browser has to download.
2. The performance panel on a throttled CPU, for a long task.
3. The devtools timeline, for which component re-renders and why.
4. A counter like the probe, for a number that goes into a test or a report.

Optimising before step 2 is guessing, and the guess is usually wrong: a component that looks expensive because it is
long is often cheap, and a three-line component inside a list of a thousand rows is not.

## Check yourself

Add the render counter to the catalogue's rows, type a search term, and write down how many rows render for four
keystrokes. Then remove the `#footer` slot and measure again, and say which of the two you would ship for ten books,
and which for ten thousand.
