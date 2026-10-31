---
title: Lifecycle
summary: The hooks still run in the order they always did, and signals move most of their work somewhere else.
chapter: Components
minutes: 12
status: draft
---

## The order the hooks run in

| Hook | Runs | Typical use |
| --- | --- | --- |
| constructor | before any input is set | injection only |
| `ngOnInit` | once, after the first inputs are set | setup that needs inputs |
| `ngAfterContentInit` | once, after projected content exists | content queries |
| `ngAfterViewInit` | once, after this template exists | view queries |
| `ngAfterViewChecked` | after every check of this view | measuring, and rarely worth it |
| `ngOnDestroy` | before the component is removed | releasing resources |

A constructor runs before inputs arrive, which is the reason reading an input there gives you
`undefined`. With signal inputs the problem mostly disappears, because a field initializer that creates
a `computed` reads the input later rather than at construction:

```ts
export class ShelfSummary {
  readonly books = input.required<readonly Book[]>();

  protected readonly total = computed(() => this.books().length);
}
```

`total` is correct from the first render and `ngOnInit` is not needed. In an application built on
signals, `ngOnInit` usually disappears, and so does `ngOnChanges`: an input signal is a signal, so an
`effect` that reads it runs on every change.

## Where the work goes instead

| Old habit | Current answer |
| --- | --- |
| derive a value in `ngOnInit` | a `computed` |
| mirror an input into a field in `ngOnChanges` | a `computed` or `linkedSignal` |
| subscribe in `ngOnInit`, unsubscribe in `ngOnDestroy` | `takeUntilDestroyed()` or `toSignal` |
| read an element in `ngAfterViewInit` | `afterNextRender`, or a query read in the template |
| measure after every check | `afterRenderEffect` |

## After render is its own phase

```ts
export class SearchBox {
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  readonly autofocus = input(false);

  constructor() {
    afterNextRender(() => {
      if (this.autofocus()) {
        this.field().nativeElement.focus();
      }
    });
  }
}
```

`afterNextRender` runs once, after the browser has painted, and it only runs in the browser, so it is
safe in a server rendered application where there is no DOM to measure. `afterRenderEffect` is the
repeating version: it re-runs whenever a signal it reads changes, in the after render phase, which is
where anything that needs layout belongs.

Both need an injection context. A call from inside an event handler throws, and the fix is to create
the registration where the component is constructed.

## Destroying cleanly

```ts
export class LoanHistory {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  start(): void {
    this.http
      .get<readonly Loan[]>('/api/loans')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loans) => this.loans.set(loans));
  }
}
```

`takeUntilDestroyed()` without an argument reads the `DestroyRef` of the current injection context,
which is convenient inside a constructor and wrong inside a method that runs later. Passing a
`DestroyRef` you captured is the fix, and it is the version I use in a service where `start()` is called
by a component.

`ngOnDestroy` is still the right hook for releasing something that has no operator, such as a timer
started by hand or a listener added with `addEventListener`. `DestroyRef.onDestroy(callback)` is the
registration form of the same thing, and it composes better because the callback lives next to the
thing it cleans up.

## Lifecycle in a zoneless application

Without Zone.js, a hook runs when change detection runs, and change detection is triggered by signals,
events and the router. A component that mutates a plain field in `setInterval` has no hook arriving to
save it, and the page will not update. That is a consequence of removing the guesswork rather than a
bug, and the fix is to write to a signal.

## Check yourself

Take the loan form and move one derivation from a method into a `computed`, then delete any lifecycle
hook that is left with nothing to do. Then add an `afterRenderEffect` that logs the height of the
catalogue list and change the filter to watch it run again.
