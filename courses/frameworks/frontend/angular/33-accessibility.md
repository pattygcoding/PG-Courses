---
title: Accessibility
summary: Roles the framework will not add for you, focus that survives a navigation, and what a screen reader is told.
chapter: Performance and accessibility
minutes: 13
status: draft
---

## Semantic elements first

A `<button>` is focusable, responds to Enter and Space, and is announced as a button. A `<div>` with a
click handler is none of those things, and the work of adding them back is larger than using the button.
The templates in this course follow three habits that cover most of it:

```html
<label for="search-field">{{ label() }}</label>
<input #field id="search-field" type="search" [value]="term()" (input)="update($event)" />
```

```html
<button type="button" (click)="wanted.set(true)" [disabled]="wanted()">
  {{ wanted() ? 'On the waiting list' : 'Add to the waiting list' }}
</button>
```

```html
<fieldset [formGroupName]="$index">
  <legend>Line {{ $index + 1 }}</legend>
</fieldset>
```

- Every input has a label bound with `for` and `id`. A placeholder is not a label: it disappears as soon
  as the person types and it is not read as the field's name by every screen reader.
- Buttons that do not submit carry `type="button"`, and anything that can be disabled uses the
  attribute rather than a class, so assistive technology is told.
- A repeated group of fields is a `fieldset` with a `legend`. The reservation form uses one per line,
  which is what makes "Line 2, Genre" meaningful when a screen reader lists the fields.

## Live regions for state that changes on its own

```html
@if (catalog.status() === 'loading') {
  <p role="status">Loading the catalogue...</p>
} @else if (catalog.status() === 'error') {
  <p role="alert">
    The catalogue could not be loaded.
    <button type="button" (click)="catalog.reload()">Try again</button>
  </p>
}
```

`role="status"` is a polite live region: the text is announced when the reader finishes what it is
saying. `role="alert"` interrupts, which is right for a failure and wrong for a loading line. I checked
the rendered page with a browser's accessibility tree while writing this, and the validation message
below the member field is exposed as an alert while the loading line is a status.

The content has to be a single element that changes, not a new element every time, for a live region to
be announced once. Rendering the message inside an `@if` block that appears and disappears works,
because the element is created with its text already in it.

## Focus after a navigation

A client side navigation replaces the content of the page and leaves focus where it was, which for a
keyboard user means the next Tab continues from the middle of a page that no longer exists. Two fixes
are common:

```html
<a class="skip" routerLink="/books" fragment="content">Skip to the catalogue</a>
```

```ts
export class App {
  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.heading()?.nativeElement.focus());
  }

  private readonly heading = viewChild<ElementRef<HTMLElement>>('pageHeading');
}
```

with `tabindex="-1"` on the heading the focus moves to. The element needs that attribute to be
focusable by script, and it does not appear in the tab order.

For a form, the equivalent move is to focus the first field with a problem after a failed submit, which
is what the `viewChildren` query from the components chapter is for.

## What a form has to say

```html
<input id="member" [formField]="loan.member" [attr.aria-invalid]="loan.member().invalid()" />
@if (loan.member().touched() && loan.member().errors().length > 0) {
  <p role="alert">{{ loan.member().errors()[0].message }}</p>
}
```

Three details make that accessible: the message is text in the document rather than a tooltip, the
message is tied to the field with `aria-describedby` where the field's markup allows it, and the invalid
state is exposed as `aria-invalid`. A red border alone tells a screen reader nothing.

`aria-describedby` needs an id on the message and a reference on the input:

```html
<input id="member" [formField]="loan.member" aria-describedby="member-error" />
<p id="member-error" role="alert">Enter the member name.</p>
```

The cost is the extra ids, and the benefit is that the message is read out with the field rather than
after it.

## The route's active link

`routerLinkActive` sets `aria-current` on the active link as well as the class you name, which is why
the shell in this course does not set it by hand:

```html
<a routerLink="/books" routerLinkActive="active">Catalogue</a>
```

The class is for the styling and `aria-current="page"` is what a screen reader announces.

## Checking it

- Tab through the page. If focus disappears anywhere, something is not reachable, and a custom widget is
  the usual cause.
- Turn on the accessibility tree in the browser's inspector and read what each control is called. A
  button announced as "button" is a button with no name.
- Run a Lighthouse accessibility audit, which catches the mechanical cases: missing labels, contrast,
  heading order.
- Read the same page with a screen reader for ten minutes. It is the only step that finds the problems
  an automated check cannot, such as a field group with no legend.

## Check yourself

Turn the genre select's label into a placeholder and remove the label element, then strip the fieldset
and legend from the reservation form and read the accessibility tree for both. Then add focus movement
on navigation and tab through three pages in a row.
