---
title: Control flow and lists
summary: Blocks replace the structural directives, and the track expression decides which rows survive an update.
chapter: Getting started
minutes: 13
status: draft
---

## Conditionals are blocks

```html
@if (catalog.status() === 'loading') {
  <p role="status">Loading the catalogue...</p>
} @else if (catalog.status() === 'error') {
  <p role="alert">
    The catalogue could not be loaded.
    <button type="button" (click)="catalog.reload()">Try again</button>
  </p>
} @else {
  <p>{{ catalog.visible().length }} of {{ catalog.all().length }} books</p>
}
```

This is the loading, error and loaded states of the catalogue, and it is what the whole page depends
on. Three things changed with blocks compared to `*ngIf`:

- No `NgIf` import. The syntax is part of the template language, so the `imports` array stays shorter.
- The `else if` branch is written as one word: `@else if`.
- Nothing needs an `async` pipe to unwrap. A signal is called.

For a value that several places in a branch need, `@let` names it once:

```html
@if (book.hasValue()) {
  @let details = book.value();
  <h1>{{ details.title }}</h1>
  <p>{{ details.author }}</p>
}
```

`@let` is scoped to the block it sits in and re-evaluates with its dependencies, so it behaves like a
local readonly field rather than a cached copy.

## A switch over the same status

```html
@switch (catalog.status()) {
  @case ('loading') {
    <p role="status">Loading the catalogue...</p>
  }
  @case ('error') {
    <p role="alert">The catalogue could not be loaded.</p>
  }
  @default {
    <p>{{ catalog.visible().length }} of {{ catalog.all().length }} books</p>
  }
}
```

`@switch` is a strict comparison, so `@case ('loading')` matches the string exactly and there is no
fall-through. I reach for it when one value has three or more states and each one renders a different
element, and for `@if` when the branches test different things.

The status strings come from the resource API and are worth knowing by name: `idle`, `loading`,
`reloading`, `resolved`, `error` and `local`. A `@switch` over them is the reason a page can show a
loading line without a boolean per state.

## Lists need a track expression

```html
<ul>
  @for (book of catalog.visible(); track book.id) {
    <li>
      <a [routerLink]="['/books', book.id]">{{ book.title }}</a>
      by {{ book.author }}
      <span class="genre">{{ book.genre | genreLabel }}</span>
    </li>
  } @empty {
    <li>No book matches "{{ catalog.search() }}".</li>
  }
</ul>
```

`track book.id` tells Angular which DOM nodes belong to which item. When the filtered list changes,
rows whose id is still present are reused and their text is updated; rows that disappeared are
removed; new rows are created. Without a track expression this is a compile error, which is a
deliberate decision: `@for` will not silently fall back to index tracking and detach every input in a
list the moment an item is removed from the front.

`track $index` is available when the list truly has no identity, and it is the wrong answer for a list
that can be reordered, filtered or appended to.

Inside the block, these variables are available:

| Variable | Value |
| --- | --- |
| `$index` | position of the row |
| `$count` | total rows |
| `$first`, `$last` | booleans for the edges |
| `$even`, `$odd` | booleans for the stripes |
| `$any(value)` | escape hatch that turns off type checking for that expression |

`@empty` renders when the collection is empty, and it is part of the same block so a filter that
removes every row shows a message instead of an empty list. That is the `@empty` branch in the code
above, reached by searching for a title that is not in the catalogue.

## Templates are typed

```html
<a [routerLink]="['/books', book.id]">{{ book.title }}</a>
```

`book` in that expression is a `Book`, because the compiler followed the type of `catalog.visible()`
through the signal and the template. A typo in `book.tittle` is a build error with a line number, and
`track book.id` is checked the same way. The two error codes you will meet most while learning:

```text
X [ERROR] NG8002: Can't bind to 'books' since it isn't a known property of 'app-shelf-summary'
X [ERROR] NG8001: 'app-shelf-summary' is not a known element
```

Both mean the same thing in practice: a dependency is missing from the `imports` array, or an input
name does not match.

## Check yourself

Render the catalogue with `@for` and remove the `track` expression to read the compiler's complaint.
Then add a `@empty` branch and filter the list down to nothing, and change the search input so it
matches titles in uppercase as well as lowercase.
