---
title: Styling
summary: A stylesheet in the layout, CSS Modules for components, and where the tokens live.
chapter: The app around the pages
minutes: 11
status: draft
---

## Three ways, all supported

Next.js does not have an opinion about styling, and it does support three approaches without any configuration:

| Approach | Shape | Good for |
| --- | --- | --- |
| a global stylesheet | `app/globals.css`, imported once | tokens, resets, element defaults |
| CSS Modules | `Component.module.css`, scoped by the bundler | a component's own styles |
| a CSS framework | Tailwind, configured by the CLI | utility classes, a design system |

Utility CSS is what `create-next-app` picks by default. This application is generated with `--no-tailwind`, which leaves a
plain stylesheet and class names that read as a design rather than a utility list. Both are fine, and the choice belongs to
the project rather than to the framework.

## The global stylesheet

```tsx
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Northside Library", template: "%s | Northside Library" },
};
```

Importing a stylesheet in the layout is what makes it global. In the App Router a global CSS file may be imported anywhere,
and the rule to follow anyway is one import, in the root layout, so that what is global is obvious from one file.

The tokens are at the top of this application's stylesheet:

```css
:root {
  --ink: #e8eef2;
  --muted: #9fb3c8;
  --mint: #8debc4;
  --navy: #06090e;
  --line: #16202b;
  color-scheme: dark;
}

body {
  background: var(--navy);
  color: var(--ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
}
```

Two habits in six lines, both worth copying. The palette is named rather than repeated, so a colour is changed once and the
one file that holds it is the one file to review. And `color-scheme: dark` is what tells the browser that form controls,
scrollbars and the like should be dark too, which is the difference between a dark theme and a dark theme with a white
scrollbar.

## CSS Modules

The scaffold writes a module for its starter page:

```css
/* app/page.module.css */
.main {
  padding: 2rem;
}
```

```tsx
import styles from "./page.module.css";

<main className={styles.main}>{children}</main>
```

The class name is hashed at build time, so two components can both have a `.main` and neither knows about the other. It
needs no runtime, produces a plain stylesheet, and works with every CSS feature your target browsers support.

The trade against a utility framework is the one you expect: a component's styles are in two files, and a design change
touches several modules rather than one class.

## Class names that carry state

This application's stylesheet has classes for the states a page can be in:

```css
.badge {
  border: 1px solid #24443a;
  border-radius: 999px;
  color: var(--mint);
  font-size: 0.78rem;
  padding: 0.05rem 0.5rem;
  white-space: nowrap;
}

.badge.out {
  border-color: #4a2a2a;
  color: #f0a3a3;
}
```

```tsx
{book.available === 0 ? <span className="badge out">out on loan</span> : null}
```

The class is applied from the server-rendered data, which means the state is right in the first paint. A class toggled from an
effect would paint the wrong colour once and then correct itself.

## Motion, and the reason to respect the preference

```css
.skeleton {
  animation: pulse 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
```

A pulsing skeleton is a nice loading state and a problem for anyone who asked their system not to animate things. The media
query is one block, and it belongs with the animation rather than in a later cleanup.

## Where the CSS goes in the response

A stylesheet imported by the layout is part of the document, so it is requested before the first paint and the page never
renders unstyled. That is the reason to keep the critical styles in a global file and to avoid a CSS-in-JS library that
generates them at runtime: the stylesheet would arrive after the HTML it applies to.

## Check yourself

Move one component's styles into a CSS Module, then check the built HTML for the hashed class name and the stylesheet it lives
in. Then delete a token from `:root` and find every place the build breaks, which is a count of how well the naming held up.
