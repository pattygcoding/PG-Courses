---
title: Inputs, outputs and two-way binding
summary: input, output and model are the three ways a component talks to its parent, and they are all signals.
chapter: Components
minutes: 15
status: draft
---

## Inputs are read-only signals

```ts
export class ShelfSummary {
  readonly books = input.required<readonly Book[]>();

  protected readonly total = computed(() => this.books().length);
  protected readonly copies = computed(() =>
    this.books().reduce((sum, book) => sum + book.copies, 0),
  );
}
```

```html
<app-shelf-summary [books]="catalog.all()" />
```

`input.required<readonly Book[]>()` returns an `InputSignal` with no default, and the compiler reports
an error if a parent renders the component without setting it. `input(0)` infers the type from the
default. Either way the value is read-only, and any derivation from it is a computed, so the component
recomputes once per change rather than on every check.

A required input that is not set fails loudly at runtime as well:

```text
Error: NG0950: Input "id" is required but no value is available yet.
```

I hit that in a test that read a component's `id()` before the router had bound it. The message is
about reading too early rather than about a missing binding, which is worth remembering when a
component works in the application and fails in a test.

Two options are worth knowing:

```ts
readonly count = input(0, { transform: numberAttribute });
readonly available = input(false, { transform: booleanAttribute });

/** The name a parent uses, when it should differ from the field. */
readonly term = input('', { alias: 'searchTerm' });
```

`numberAttribute` and `booleanAttribute` are the two transforms from `@angular/core` that cover the
HTML attribute case, where `"false"` is a truthy string and `"12"` is a string. A transform runs on
every write, so keep it cheap and pure.

## Outputs go one way

```ts
@Directive({
  selector: '[appClickOutside]',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class ClickOutside {
  readonly clickedOutside = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onDocumentClick(event: Event): void {
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.clickedOutside.emit();
    }
  }
}
```

```html
<div appClickOutside (clickedOutside)="close()">...</div>
```

`output<void>()` takes no payload, and `output<Loan>()` takes one. The parent binds the name of the
field, `clickedOutside` here, with `$event` holding the payload. An output is a function that emits,
not an observable, so there is no subscription to clean up; `outputFromObservable()` is the adapter
when the source really is a stream.

## A model input is two-way

The search box keeps no state. The parent owns the term, and the component reports every change:

```ts
@Component({
  selector: 'app-search-box',
  template: `
    <label for="search-field">{{ label() }}</label>
    <input #field id="search-field" type="search" [value]="term()" (input)="update($event)" />
  `,
})
export class SearchBox {
  /** Two-way: the parent passes the value in and receives every change. */
  readonly term = model.required<string>();
  readonly label = input('Search the catalogue');

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected update(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
  }
}
```

A parent can bind both halves by hand:

```html
<app-search-box [term]="catalog.search()" (termChange)="catalog.search.set($event)" />
```

or use the shorthand, which the compiler expands into exactly those two bindings:

```html
<app-search-box [(term)]="term" label="Find a book" />
```

The shorthand works with a writable signal as the target, which a test in this project checks:

```ts
@Component({ imports: [SearchBox], template: `<app-search-box [(term)]="term" />` })
class HostWithSearchBox {
  readonly term = signal('');
}
```

```ts
input.value = 'dune';
input.dispatchEvent(new Event('input'));
await fixture.whenStable();

expect(fixture.componentInstance.term()).toBe('dune');
```

`model` is the right choice when the value belongs to the parent and the component edits it, which is
the case for a text box, a select or a star rating. When the component only displays what it is given,
`input` is enough and the one-way flow stays easier to reason about.

## Choosing between them

| The component... | Use |
| --- | --- |
| displays a value it is given | `input()` |
| reports an event it noticed | `output()` |
| edits a value the parent owns | `model()` |
| needs a value and cannot work without it | `input.required()`, `model.required()` |

Mixing all four in one component is normal. The rule I follow is that the component never keeps a
second copy of a value it received; either it reads the input signal or it writes through the model.

## Check yourself

Give `SearchBox` an output that fires when the field is cleared and bind it in the catalogue to reset
the genre filter. Then make `label` a required input and read the compiler error from the call site.
Finally, add `{ transform: numberAttribute }` to a numeric input and pass `"12"` from a template to see
the type it produces.
