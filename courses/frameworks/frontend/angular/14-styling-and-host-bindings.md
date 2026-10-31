---
title: Styling and the host element
summary: Component styles are scoped by an attribute on every element, and :host is how they reach the component itself.
chapter: Components
minutes: 13
status: draft
---

## A component style is scoped by the compiler

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

The compiler rewrites each selector to match only elements this template rendered, using an attribute
it adds to them. That is why `.active` in one component does not touch a `.active` in another, and why
the class name matters less than it does in a global stylesheet: `wrapper` in one component and
`wrapper` in another cannot collide.

Encapsulation is set per component:

```ts
@Component({
  selector: 'app-book-list',
  encapsulation: ViewEncapsulation.Emulated,
  template: `...`,
})
```

`Emulated` is the default and adds the attribute. `None` turns the scoping off, which is how a
component styles its projected content and the usual source of a rule that hits three other pages.
`ShadowDom` uses the browser's own shadow DOM, which also blocks global styles from reaching in; it
suits a widget embedded in someone else's page more than a page of an application.

## :host is the component element

```html
<app-panel heading="Book details">...</app-panel>
```

`app-panel` is an element in the page, and it is inline by default, like a `<span>`. That is why a
component with a border or a margin starts with:

```ts
styles: `
  :host {
    display: block;
  }
`
```

`:host-context(.dark)` matches when an ancestor carries a class, which is the mechanism for a theme
toggle that lives at the top of the document. A state class on the host works the same way:

```ts
@Component({
  selector: 'app-panel',
  host: {
    '[class.busy]': 'busy()',
    '[attr.aria-busy]': 'busy()',
  },
})
```

## Declaring host bindings in metadata

The `host` object on the decorator takes listeners and bindings for the element the component or
directive was applied to:

```ts
@Directive({
  selector: '[appClickOutside]',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '[class.open]': 'open()',
  },
})
export class ClickOutside {
  readonly open = signal(false);

  protected onDocumentClick(event: Event): void {
    // ...
  }
}
```

The older form was `@HostListener` and `@HostBinding` on methods and fields. Both still work, and the
metadata form keeps them in one place and out of the class body. Listeners with a `document:` prefix
attach outside the element, which is the only way a click-outside directive can see the clicks it
needs.

## Global styles, and what belongs there

`src/styles.css` is the one stylesheet every page gets. That is where reset rules, the font, colours as
custom properties and anything a component cannot own belong:

```css
/* src/styles.css */
:root {
  --ink: rgb(20, 22, 26);
  --mint: rgb(20, 110, 90);
}

body {
  font-family: system-ui, sans-serif;
  color: var(--ink);
  margin: 0;
}

:focus-visible {
  outline: 2px solid var(--mint);
  outline-offset: 2px;
}
```

The split I use: tokens, resets and one or two element defaults are global, and every rule that belongs
to a screen lives in that component's styles. A component that needs a token reads the variable, so a
theme change is one file rather than forty.

`::ng-deep` still exists and still reaches into a child component's DOM, which the guide discourages.
The two replacements are a CSS variable passed down through the theme, or a global rule scoped to a
well named class on the component host.

## A style budget fails the build

```json
{
  "type": "anyComponentStyle",
  "maximumWarning": "4kB",
  "maximumError": "8kB"
}
```

That entry in `angular.json` is the reason a component with 200 lines of CSS fails the release build
rather than being fixed later. Eight kilobytes of CSS in one component usually means it is doing two
jobs, and splitting it is the answer rather than raising the limit.

## Check yourself

Style the search box so it works in a narrow column, using `:host` for the wrapper and a component
style for the input. Then set `encapsulation: ViewEncapsulation.None` on it, reload, and find which
other page changed. Finally, replace a hard coded colour in the component with a custom property from
`styles.css`.
