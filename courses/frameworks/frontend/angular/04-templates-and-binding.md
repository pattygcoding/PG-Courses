---
title: Templates and binding
summary: One syntax per direction, and the compiler checks both of them against your TypeScript types.
chapter: Getting started
minutes: 13
status: draft
---

## Text, properties and attributes

```html
<h2 [class.quiet]="quiet()" [style.color]="quiet() ? 'rgb(120, 120, 120)' : null">
  {{ copies() }} copies
</h2>

<button type="button" (click)="lend()" [attr.aria-label]="'Lend a copy of this title'">
  Lend
</button>

<input #search type="search" placeholder="Search" (keyup.enter)="searchFor(search.value)" />

<p [attr.data-state]="copies() > 0 ? 'on the shelf' : 'all out'">Shelf</p>
```

That is the whole binding vocabulary in five lines:

| Direction | Syntax | Example |
| --- | --- | --- |
| value into text | `{{ }}` | `{{ copies() }}` |
| value into a property | `[name]` | `[class.quiet]`, `[style.color]` |
| value into an attribute | `[attr.name]` | `[attr.aria-label]` |
| event out of the element | `(name)` | `(click)`, `(keyup.enter)` |
| element into the template | `#name` | `#search` |

`[class.quiet]` and `[style.color]` are the two shorthands the compiler understands directly. A
`null` or `undefined` value removes the class or the property, which is why the ternary above can
switch the colour off rather than writing a colour that means "nothing".

## Property binding is not attribute binding

A DOM element has properties and attributes, and they are different things. `[value]` writes
`input.value`, so it survives whatever the user typed until your value changes. `[attr.value]` writes
the HTML attribute, which only sets the initial value. When you reach for `[attr.]`, it is usually
because the property does not exist:

```html
<button [attr.aria-label]="label"></button>
<svg [attr.viewBox]="'0 0 24 24'"></svg>
<tr [attr.data-state]="row.state"></tr>
```

`aria-*`, `data-*` and most SVG names have no matching DOM property, so the attribute form is the only
one that works. For everything else, name the property and leave the prefix off. If you type a
property that does not exist, the compiler says so:

```text
X [ERROR] NG8002: Can't bind to 'books' since it isn't a known property of 'app-shelf-summary'
```

## Events go up, state goes down

The catalogue search box is the smallest complete example of the pattern this course uses everywhere:

```html
<label for="search">Search the catalogue</label>
<input
  id="search"
  type="search"
  [value]="catalog.search()"
  (input)="updateSearch($event)"
/>
```

```ts
protected updateSearch(event: Event): void {
  this.catalog.search.set((event.target as HTMLInputElement).value);
}
```

The value flows down from the signal, the event flows up to a method, and the method writes the same
signal. There is one source of truth, and no local copy to keep in step. The cast on
`event.target` is the price of the DOM event type, and it is a small one.

A template reference variable is the alternative when the element is right there:

```html
<input #search type="search" (keyup.enter)="searchFor(search.value)" />
```

`search` is the element, `search.value` is the string, and the expression stays in the template
without a handler method. I use the handler form when the value needs parsing or validation, and the
reference form when it is a straight handover.

## Event modifiers and the `$event` object

```html
<form (submit)="save($event)" novalidate></form>
<input (keyup.enter)="search()" (keyup.escape)="clear()" />
<button (click)="remove(book.id)" [disabled]="busy()">Remove</button>
```

`keyup.enter` and `keyup.escape` are the two the compiler knows for keyboard events; a modifier that
is not a key name is not supported, so `(keyup.control.z)` is not a thing. `$event` is the DOM event
typed to the element, and passing it to a method that declares `Event` is what keeps the cast in one
place.

A click handler on a button inside a form submits the form unless the button is `type="button"`.
That is browser behaviour rather than framework behaviour, and it is the reason the retry button in
the catalogue carries the attribute.

## Two-way binding is built from these two

```html
<app-search-box [(term)]="catalog.search" />
```

That expansion is an input and an output with a matching name, and it is the subject of the page on
model inputs. Everything else in this course is the one-way pair above, which is usually what you
want: one signal own the value, one method change it, and a test that can call either side.

## Check yourself

Add the binding demo to a page and press the Lend button until the count reaches zero. Then change
`[class.quiet]` to `[attr.class]` and work out from the page why the style stopped applying. Finally
bind `[value]` on the search input and type into it, then change the binding to `[attr.value]` and
type again.
