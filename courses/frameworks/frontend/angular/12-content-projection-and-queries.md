---
title: Content projection and queries
summary: Slots for the content a parent writes, and signal queries for the elements a component owns.
chapter: Components
minutes: 14
status: draft
---

## A component can have slots

```ts
@Component({
  selector: 'app-panel',
  template: `
    <section class="panel">
      <h2>{{ heading() }}</h2>
      <div class="body">
        <ng-content />
      </div>
      <div class="actions">
        <ng-content select="[panelActions]" />
      </div>
    </section>
  `,
  styles: `
    .panel {
      border: 1px solid rgb(200, 200, 200);
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .actions:empty {
      display: none;
    }
  `,
})
export class Panel {
  readonly heading = input.required<string>();
}
```

A parent fills the slots with ordinary markup:

```html
<app-panel heading="Book details">
  @if (book.hasValue()) {
    @let details = book.value();
    <h1>{{ details.title }}</h1>
    <p>{{ details.author }} - {{ details.genre | genreLabel }}</p>
  }

  <button panelActions type="button" (click)="wanted.set(true)" [disabled]="wanted()">
    {{ wanted() ? 'On the waiting list' : 'Add to the waiting list' }}
  </button>
</app-panel>
```

Three rules govern what lands where:

- `<ng-content />` with no `select` is the catch-all: everything that matches no other slot.
- `<ng-content select="[panelActions]" />` takes elements carrying that attribute. A select can also be
  a tag name, a class or a CSS selector, and `ngProjectAs` on the parent side overrides the match.
- Projection is not dynamic. Angular resolves the slots once, so a component cannot decide at render
  time to move an element from one slot to another. Deciding where content goes is a job for `@if` in
  the parent or for an input that changes the child's own template.

A test pins the behaviour, because a project helper that silently drops content is hard to notice
otherwise:

```ts
expect(fixture.nativeElement.querySelector('.actions button')).toBeTruthy();
expect(fixture.nativeElement.querySelector('.body button')).toBeNull();
```

## Projected content keeps its own context

The markup in that example belongs to the parent, so the parent's component instance evaluates its
bindings, and the child's styles do not reach into it. `:host ::ng-deep .panel h1` still reaches across
that boundary, which is why the styling page treats `::ng-deep` as a last resort: it moves a rule out
of the place its name suggests it lives.

The practical rule: a slot is for structure and layout, and anything that needs the child's styles
should be rendered by the child.

## Queries find elements and components

```ts
export class SearchBox {
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  constructor() {
    afterNextRender(() => {
      if (this.autofocus()) {
        this.field().nativeElement.focus();
      }
    });
  }
}
```

```html
<input #field id="search-field" type="search" [value]="term()" (input)="update($event)" />
```

`viewChild.required<ElementRef<HTMLInputElement>>('field')` returns a signal that reads as the input
element. There are four variants:

| Query | Finds | Notes |
| --- | --- | --- |
| `viewChild` | one element or component in this template | `.required` throws if it is absent |
| `viewChildren` | every match | a signal of a readonly array |
| `contentChild` | one element or component projected into this component | only after content init |
| `contentChildren` | every projected match | same timing |

The timing is the part to be careful about. A query is populated after the view is created, so reading
it in a field initializer is too early, and `viewChild.required` throws the same `NG0950` error as a
required input when read before it is available. Two safe places to read one:

```ts
constructor() {
  afterNextRender(() => this.field().nativeElement.focus());
}
```

```html
@if (panel(); as panel) {
  <p>{{ panel.heading }}</p>
}
```

A query for a component also gives access to its inputs, which is how a parent can read a child's
state, but a `model` or an output is usually the clearer way to pass data in either direction. I reach
for a query when the answer is a DOM element that needs an imperative call, such as `focus()`.

## Element references and ElementRef

`ElementRef` is a wrapper around the native element, and `nativeElement` is the DOM node. Using it is
the one place in this course where a template is not enough, and it comes with two costs: the code
runs after render rather than during it, and the element is untyped beyond what you declare in the
generic. Wrapping the read in a small method keeps the imperative part in one place.

## Check yourself

Add a `viewChildren` query that finds every `HTMLInputElement` in the loan form and write a method that
focuses the first invalid one. Then move the query into `ngOnInit` and read what happens, and put it
back in `afterNextRender`.
