---
title: Directives and pipes
summary: Two small classes that shape a template, and the memoisation that makes a pipe worth having.
chapter: Components
minutes: 14
status: draft
---

## A directive is a class without a template

```ts
import { Directive, ElementRef, inject, output } from '@angular/core';

/**
 * Emits when a click lands outside the host element. Host listeners are
 * declared in the metadata, so the directive class keeps no template.
 */
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
<div appClickOutside (clickedOutside)="closeMenu()">
  <button type="button" (click)="toggle()">Loans</button>
</div>
```

Three things make it a directive rather than a component:

- The selector is an attribute, in square brackets, so it decorates an element that already exists.
- There is no template. The class adds behaviour to the element it is applied to.
- It still goes in the `imports` array of every component that uses it, and a name missing from that
  array is the `NG8001` compile error.

`hostDirectives` composes behaviour from other directives, which is how a library exposes a set of
host bindings behind one selector:

```ts
@Component({
  selector: 'app-field',
  hostDirectives: [{ directive: ClickOutside, outputs: ['clickedOutside'] }],
  template: `...`,
})
export class Field {}
```

## Structural directives and control flow

`*ngIf` and `*ngFor` are still supported, and the blocks in the template language replace them. A
custom structural directive is possible with `TemplateRef` and `ViewContainerRef`, and in a v22
codebase it is rarely the right answer: the template language covers conditionals, loops and deferral,
and a directive that renders a subtree is harder to read than the block that does the same thing.

## A pipe is a function with a name

```ts
import { Pipe, type PipeTransform } from '@angular/core';

const NAMES: Record<string, string> = {
  'science-fiction': 'Science fiction',
  'non-fiction': 'Non-fiction',
};

/** Turns the API's genre slugs into headings a person would read. */
@Pipe({ name: 'genreLabel' })
export class GenreLabelPipe implements PipeTransform {
  transform(genre: string | null | undefined): string {
    if (!genre) {
      return 'Unclassified';
    }
    return NAMES[genre] ?? genre.charAt(0).toUpperCase() + genre.slice(1);
  }
}
```

```html
<span class="genre">{{ book.genre | genreLabel }}</span>
```

A pipe appears in the template with `|`, its argument on the right of a colon when it takes one
(`{{ loan.dueOn | date: 'mediumDate' }}`), and it declares a type as well: the compiler knows
`genreLabel` returns a `string`, so `{{ book.genre | genreLabel | uppercase }}` type-checks.

Because a pipe is a plain class with a method, testing one needs no TestBed at all:

```ts
const pipe = new GenreLabelPipe();

it('names a genre the API uses a slug for', () => {
  expect(pipe.transform('science-fiction')).toBe('Science fiction');
});

it('labels a missing genre', () => {
  expect(pipe.transform(null)).toBe('Unclassified');
});
```

## Pure by default, and that is the point

A pipe is pure unless you say otherwise, and a pure pipe is only re-run when its input changes. In a
list of two hundred rows with the same pipe, the compiler runs it once per distinct argument and reuses
the result for the rest. That is what makes a pipe a reasonable place for formatting work.

The cost of purity is that a pipe cannot see a change in something it did not receive as an argument:

```ts
@Pipe({ name: 'filterBy', pure: false }) // runs after every check
export class FilterByPipe implements PipeTransform {
  transform(books: readonly Book[], term: string): readonly Book[] {
    return books.filter((book) => book.title.includes(term));
  }
}
```

An impure pipe runs on every change detection cycle, in every row it appears in, and it is the reason
filtering belongs in a `computed`:

```ts
readonly visible = computed(() => {
  const term = this.search().trim().toLowerCase();
  return term.length === 0 ? this.all() : this.all().filter((book) => book.title.toLowerCase().includes(term));
});
```

## The pipes that ship with Angular

`@angular/common` provides the formatters every application needs, and they are locale aware through
`LOCALE_ID`:

```html
{{ loan.dueOn | date: 'dmy' }}
{{ book.copies | number }}
{{ fee | currency: 'EUR' }}
{{ book.title | slice: 0 : 30 }}
```

A locale other than the default needs its data registered once, at startup:

```ts
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);
```

with `{ provide: LOCALE_ID, useValue: 'es' }` in the providers. Importing the locale data pulls it into
the bundle, so a multi locale application is a build decision rather than a runtime one, which the
internationalisation guide covers.

`AsyncPipe` is still there for observables. In a codebase built on signals, `toSignal` in the component
is the better place for that conversion, because the result is a signal that a `computed` can use.

## Check yourself

Write a directive that marks an element as read-only when an input is true, using a host binding rather
than a class inside the template. Then write a pipe that turns a `days` count into "2 weeks" and test
it without TestBed. Finally, change the genre pipe to `pure: false` and log inside `transform`, then
scroll the catalogue and watch the log.
