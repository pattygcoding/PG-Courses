---
title: A first component
summary: A class, a selector and a template, and the four metadata fields that make them a component.
chapter: Getting started
minutes: 12
status: draft
---

## The root component

A generated application starts with one component and one config file. Here is the component the CLI
writes, with the shell added in the next chapter:

```ts
// src/app/app.ts
import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Northside Library');
}
```

Four metadata fields do the work:

- `selector` is the tag other templates use, `app-root` here.
- `imports` lists everything this template is allowed to use: components, directives and pipes.
- `templateUrl` and `styleUrl` point at the HTML and CSS files the generator wrote beside the class.
- `changeDetection` is absent, which is the v22 default and means the compiler decides when this
  component needs to be checked.

The `imports` array is the part that surprises people arriving from `NgModule`: a standalone component
declares its own dependencies, and anything left out is a compile error rather than a blank page.

## Inline template, separate template

A small component reads better as one file:

```ts
// src/app/library/shelf-summary.ts
import { Component, computed, input } from '@angular/core';
import type { Book } from './book';

/** Loaded on demand by the @defer block in the catalogue. */
@Component({
  selector: 'app-shelf-summary',
  template: `
    <p>{{ total() }} books, {{ copies() }} copies on the shelf.</p>
  `,
})
export class ShelfSummary {
  readonly books = input.required<readonly Book[]>();

  protected readonly total = computed(() => this.books().length);
  protected readonly copies = computed(() =>
    this.books().reduce((sum, book) => sum + book.copies, 0),
  );
}
```

The rule I use: a template of a few lines goes inline, and anything with a form or a list of blocks
goes in its own file where the editor's HTML support can help. A component style block follows the
same split, and both are checked by the same compiler.

## Class fields are the state

```ts
protected readonly title = signal('Northside Library');
```

That line is worth reading twice. The field is a signal, so the template reads `title()` and Angular
tracks the dependency. `protected` matches the style guide: the template can read it, another class
cannot. `readonly` is on because the field holds one signal for the life of the component and the
signal itself is what changes.

A component written this way needs no constructor, no `ngOnInit` and no `this` gymnastics. That stays
true through the rest of the course, which is the reason the signals chapter comes early.

## A first feature component

```ts
// src/app/library/book-detail.ts
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import type { Book } from './book';
import { GenreLabelPipe } from './genre-label.pipe';

@Component({
  selector: 'app-book-detail',
  imports: [RouterLink, GenreLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (book.hasValue()) {
      @let details = book.value();
      <h1>{{ details.title }}</h1>
      <p>{{ details.author }} - {{ details.genre | genreLabel }}</p>
      <p>{{ copies() }}</p>
    } @else if (book.error()) {
      <p role="alert">That book is not in the catalogue.</p>
    } @else {
      <p role="status">Loading the book...</p>
    }

    <a routerLink="/books">Back to the catalogue</a>
  `,
})
export class BookDetail {
  /** Bound from the :id route parameter by withComponentInputBinding. */
  readonly id = input.required<string>();

  protected readonly book = httpResource<Book>(() => `/api/books/${this.id()}.json`);

  protected readonly copies = computed(() => {
    const details = this.book.value();
    return details ? `${details.copies} copies on the shelf` : '';
  });
}
```

Every piece of that file is a topic of its own later: an input, an HTTP resource, a pipe, a computed
and a change detection strategy. For now, read it as the shape of a component in this codebase: a
class with signal fields, a template that renders each state the data can be in, and an imports list
that names the dependencies.

`ChangeDetectionStrategy.OnPush` is explicit here. In a zoneless application a component that reads
signals is already only checked when its signals change, so the strategy mostly documents the
intention and keeps the component honest if someone later drops a mutable field into it.

## One style block, scoped to one component

```css
/* src/app/app.css */
:host {
  display: block;
}

.shell {
  display: flex;
  gap: 1rem;
  align-items: baseline;
  margin: 0 auto;
  max-width: 48rem;
  padding: 1rem;
}

nav {
  display: flex;
  gap: 1rem;
}

.active {
  font-weight: 700;
}
```

`:host` is this component's own element, so `display: block` is applied to `app-root` itself. The
`.active` rule reaches elements this template renders and nothing else, which the styling page takes
apart in detail.

## Check yourself

Generate a component with `ng generate component library/reading-progress`, then give it a
`readonly progress = signal(0)` field, print it in the template, and bind a button that raises it.
Delete the component from the `imports` array of the component that uses it and read the compiler
error before you put it back.
