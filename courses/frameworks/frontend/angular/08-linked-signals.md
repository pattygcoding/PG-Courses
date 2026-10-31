---
title: Derived state with linked signals
summary: A writable value that follows another signal, and resets when that signal changes.
chapter: Signals and state
minutes: 11
status: draft
---

## The problem a linked signal solves

The catalogue keeps a selected genre for the waiting list query. Two requirements pull in opposite
directions:

- the selection has to follow the data, so a catalogue with no science fiction does not ask for it,
- the selection has to be writable, because a person picks a genre and expects their choice to stay.

A `computed` cannot do the second: it has no `set`. A plain `signal('')` cannot do the first, and
seeding it in an effect means a render with the wrong value first. `linkedSignal` is the API for
exactly this shape:

```ts
/** Follows the first genre until someone picks another one. */
readonly genre = linkedSignal(() => this.genres()[0] ?? '');
```

The signal has a writable value, so `genre.set('poetry')` works from the select handler:

```ts
protected updateGenre(event: Event): void {
  this.catalog.genre.set((event.target as HTMLSelectElement).value);
}
```

It also has a source. `genres()` is a computed, so when the catalogue reloads and the genre list
changes, `genre` recomputes from the source and the manual choice is dropped. That is the behaviour I
want for a filter whose options can disappear, and it is worth thinking about before you reach for
this API, because sometimes keeping the selection is what you want instead.

## What it does with the previous value

A linked signal recomputes when its source changes, and the computation runs again. The value it
returns replaces whatever was written in between. There is a second form with an explicit source and a
computation that receives the previous value, for the cases where a reset is too blunt:

```ts
readonly quantity = linkedSignal({
  source: this.book,
  computation: (book, previous) => previous?.value ?? book.copies,
});
```

`source` is read reactively, `previous` is the last value of the linked signal, and returning the
previous value keeps it. I reach for the single-argument form until a reset surprises me, and the
explicit form after that.

## Equality decides how often anything runs

```ts
readonly selection = linkedSignal(() => this.genres()[0] ?? '');
readonly label = computed(() => this.selection().toUpperCase());
```

If the source recomputes and produces the same string, the linked signal compares with `Object.is`,
decides nothing changed, and `label` does not recompute. That is the same comparison every signal
uses, and it can be overridden:

```ts
readonly visible = signal<readonly Book[]>([], {
  equal: (a, b) => a.length === b.length && a.every((book, index) => book.id === b[index]?.id),
});
```

A custom equality function is worth writing when a new array with equal contents is the common case,
because it stops a list from re-rendering. Writing one that is wrong is worse than the default: a
comparison that reports equal for genuinely different values loses updates, and nothing warns you.

## Where it fits next to the other two

| Need | API |
| --- | --- |
| a value I own and change | `signal` |
| a value derived from other signals | `computed` |
| a value derived from other signals that can also be written | `linkedSignal` |
| pushing a value into a non-reactive API | `effect` |

Most state is the first two. A linked signal appears where a form of local choice sits on top of
remote data: the selected row in a filtered table, the page number after a reload, the active tab
that disappears when a feature flag changes.

## Check yourself

Add a `page` linked signal to the catalogue that starts at 1 and resets when the search term changes,
and slice `visible()` with it. Then set the page by hand and change the search term to watch the
reset. Finally, make the computation keep the previous page when the new view still has enough rows
and decide which behaviour you would ship.
