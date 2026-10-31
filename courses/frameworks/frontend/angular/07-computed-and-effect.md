---
title: Computed values and effects
summary: Derive state with computed, and keep effects for the APIs that are not reactive at all.
chapter: Signals and state
minutes: 15
status: draft
---

## A computed value is a derivation

```ts
readonly visible = computed(() => {
  const term = this.search().trim().toLowerCase();
  if (term.length === 0) {
    return this.all();
  }
  return this.all().filter(
    (book) =>
      book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term),
  );
});
```

Three properties matter, and they are all things a method would get wrong:

- **Lazy.** Nothing runs until something reads `visible()`.
- **Cached.** Reading it twice with no change in between runs the filter once.
- **Dependency tracked.** The reads of `search()` and `all()` inside the function are recorded, so the
  value is recomputed when either changes and not before.

A computed is read-only. There is no `set` on it, because the value is a function of its inputs and
writing it would leave the two disagreeing.

## A method in a template is not a computed

```html
<p>{{ count() }} books</p>
```

is fine. This is not:

```html
<p>{{ summaryOf(books()) }}</p>
```

A method call in a template runs every time the component is checked, and in a list it runs for every
row. A computed runs once per input change. When you find yourself adding a method to a template,
check whether the inputs it reads are signals, because if they are, the computed version is both
faster and clearer about what it depends on.

## Small computeds compose

```ts
readonly total = computed(() => this.books().length);

readonly copies = computed(() => this.books().reduce((sum, book) => sum + book.copies, 0));
```

Two computeds over the same input cost one pass each on first read and nothing afterwards, because
each one remembers its last value. Composition is cheap here, so there is no reason to build one
large function that returns an object with four fields.

## Rules for a computed body

A computed should be a pure function of the signals it reads. Three things break that:

```ts
// A write inside a computed is an error
readonly total = computed(() => { this.count.set(1); return this.count(); });
```

```ts
// A request inside a computed is aborted; use a resource (next pages)
readonly book = computed(() => fetch('/api/books/' + this.id()));
```

```ts
// Date.now() reads no signal, so the value never updates again
readonly age = computed(() => Date.now() - this.startedAt());
```

The third one is the subtle case. A computed caches its value until one of the signals it read
changes, so a function that reads no signals is computed once and never again. If a value has to
refresh on a timer, keep the tick in a signal and read the signal.

## An effect is for a non-reactive API

```ts
export class ReadingHistory {
  private readonly storage = inject(Storage);
  readonly lastSeen = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.lastSeen();
      if (id) {
        this.storage.set('last-seen', id);
      }
    });
  }
}
```

`localStorage` has no idea what a signal is. An effect is the bridge: it runs after the signal value
changed, and it re-runs whenever a signal it read changes. Compared to a computed:

| | computed | effect |
| --- | --- | --- |
| returns a value | yes | no |
| runs when read | yes | no, runs on change |
| order | lazy, on demand | after change detection, not at the `set` call |
| for | derived state | pushing state into something else |

Effects need an injection context, which is why this one is created in a field initializer. Calling
`effect()` inside a method that runs later throws.

## Cleanup and untracked

```ts
effect((onCleanup) => {
  const id = this.lastSeen();
  const timer = setTimeout(() => this.markStale(id), 5_000);
  onCleanup(() => clearTimeout(timer));
});
```

`onCleanup` runs before the next execution of the effect and when the component is destroyed, so a
timer or a subscription started in an effect is cleaned up in one place rather than in `ngOnDestroy`.

```ts
effect(() => {
  const id = this.lastSeen();
  const other = untracked(() => this.otherSignal());
  console.log(id, other);
});
```

`untracked` reads a signal without registering it as a dependency. Reach for it when the effect needs
a value but should not re-run when that value changes, which is the case for a counter or a flag read
only for logging.

## When not to use an effect

The temptation is to mirror one signal into another:

```ts
// Do not do this
effect(() => this.total.set(this.books().length));
```

That is a computed with extra steps and a change detection cycle of delay. If the value can be
derived, derive it. If it is a writable value that follows another, that is what `linkedSignal` is
for, which is the next page.

## Check yourself

Add a computed that counts the books by genre to the catalogue service and print it in the template.
Then write a computed that reads `Date.now()` and put it in the page, and work out why it does not
move. Finally, add an effect that writes the search term to `localStorage` and confirm it runs after
the input changes rather than during the event.
