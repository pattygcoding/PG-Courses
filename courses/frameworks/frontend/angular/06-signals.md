---
title: Signals
summary: A signal holds a value and tells the framework when it changes, which is what a plain field cannot do.
chapter: Signals and state
minutes: 14
status: draft
---

## A field is invisible, a signal is not

An application without Zone.js cannot tell that a field changed:

```ts
export class BadCounter {
  count = 0; // the template reads this once and never updates
}
```

Writing `this.count++` changes a JavaScript property. Nothing schedules a render, because nothing was
notified. The framework stopped patching `setTimeout` and `addEventListener`, so it relies on being
told. A signal is how you tell it:

```ts
import { signal } from '@angular/core';

export class Counter {
  readonly count = signal(0);

  increment(): void {
    this.count.update((value) => value + 1);
  }
}
```

```html
<p>{{ count() }}</p>
<button type="button" (click)="increment()">Add one</button>
```

Reading `count()` in the template registers the component as a consumer of that signal. The `update`
call notifies its consumers, and the component is marked for a check. The count of consumers is what
makes this fine grained: a component that never reads the signal is not checked at all when it
changes.

## set, update and the type of a signal

```ts
readonly search = signal('');
readonly days = signal<number>(14);
readonly books = signal<readonly Book[]>([]);

this.search.set('dune');
this.days.update((value) => value + 1);
this.books.update((list) => [...list, book]);
```

`set` replaces the value and `update` derives one from the current value. Both are methods on
`WritableSignal<T>`, and `signal(0)` infers `WritableSignal<number>` from the argument, while
`signal<number>(0)` spells the type out when a literal would narrow too far or when the initial value
is not the only shape the signal will hold.

Updating an array in place is the mistake to avoid:

```ts
this.books().push(book); // same array, same reference, no update
```

Signals compare with `Object.is` by default, so the array above is the same object as before and no
consumer is notified. Spread the array into a new one, which is one line and removes a class of bug.

## A signal can be read-only

```ts
import { Injectable, signal } from '@angular/core';

/** The member's session, kept in memory for this example. */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly currentToken = signal('demo-token');
  readonly token = this.currentToken.asReadonly();

  signOut(): void {
    this.currentToken.set('');
  }
}
```

`asReadonly()` returns a `Signal<string>` that reflects every change to the original and cannot be
written through. A component can read `session.token()` and display it, and the only way to change it
is `signOut()`. That is encapsulation without a getter method, and it is what I reach for whenever a
template should display a value but not be able to assign one.

Note that `asReadonly()` is shallow. It stops a caller replacing the value, and it does not stop them
mutating an object inside it.

## Signals hold the whole application's state

The catalogue keeps its search term in a signal, and its request state in a resource that exposes
signals of its own:

```ts
@Injectable({ providedIn: 'root' })
export class Catalog {
  private readonly http = inject(HttpClient);
  private readonly catalogue = httpResource<readonly Book[]>(() => '/api/books.json', {
    defaultValue: [],
  });

  readonly status = this.catalogue.status;
  readonly error = this.catalogue.error;
  readonly all = this.catalogue.value;

  readonly search = signal('');

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

  readonly genres = computed(() => [...new Set(this.all().map((book) => book.genre))].sort());

  reload(): void {
    this.catalogue.reload();
  }
}
```

`status`, `error` and `value` are signals the resource already exposes, and re-publishing them keeps
one name for one thing in the template. `search` is writable because the input writes to it. `visible`
and `genres` are computed, which is the next page.

## Check yourself

Add a `borrowedCount` signal to a component, raise it from a button, and print it. Then add
`readonly total = signal<number>(0)`, and in a method assign `this.total = signal(1)` to see what the
compiler says about a `readonly` field. Finally, hold a list in a signal and try to update it with
`push`, then with a spread, and watch which one the page reacts to.
