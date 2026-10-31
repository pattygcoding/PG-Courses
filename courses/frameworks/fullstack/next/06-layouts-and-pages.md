---
title: Layouts and pages
summary: A layout wraps a segment and everything below it, and the pages inside it keep their state.
chapter: Routing
minutes: 13
status: draft
---

## A page returns the structure

```tsx
export default function AboutPage() {
  return (
    <>
      <h1>About</h1>
      <p className="lede">A small library application, built to show what the Next.js App Router does.</p>
    </>
  );
}
```

No heading, no navigation, no `<html>`. A page is the content of a URL, and everything around it comes from the layouts
above it.

## A layout returns the frame

```tsx
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="shell site-header">
          <Link className="brand" href="/">
            Northside Library
          </Link>

          <nav className="site-nav">
            <Link href="/books">Catalogue</Link>
            <Link href="/loans">Desk</Link>
            <Link href="/about">About</Link>
          </nav>
        </header>

        <main className="shell">{children}</main>

        <footer className="shell site-footer">
          <p>Built with Next.js. Every page here renders on the server first.</p>
        </footer>
      </body>
    </html>
  );
}
```

Three rules are visible in that file. The root layout renders `<html>` and `<body>`, and it is the only layout that does.
It receives `children`, which is the page or the next layout down. And it is the place for the things every URL shares.

The type is worth a second look:

```tsx
({ children }: LayoutProps<"/">)
```

`LayoutProps` is not imported from anywhere. Next.js generates it into `.next/types/routes.d.ts` on `next dev`,
`next build` or `next typegen`, keyed by the route literal. Typing the literal, as this course does, gets autocomplete
and a check that the route exists; the plain form works too:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
```

## Nesting

A layout in a subfolder wraps only that segment:

```text
app/layout.tsx              <html>, the header, the footer
app/books/layout.tsx        a genre bar, for /books and /books/dune only
app/books/page.tsx          the catalogue
app/books/[id]/page.tsx     one book
```

Everything under `/books` gets both layouts, and `/about` gets neither of the inner ones. Nothing is registered and
nothing is passed down by hand: the tree is the nesting.

## What a layout does not do

A layout does not re-render when you navigate between the pages inside it, and it does not know which page is current.
It cannot read a page's params or search params, because it sits above them.

With Cache Components on, that behaviour is implemented with React's `Activity`: navigating away sets the previous route
to hidden rather than unmounting it. So:

- a page's state survives a navigation back to it, including form input and expanded sections;
- its effects are cleaned up when it is hidden and run again when it is shown;
- a few recent routes stay in the DOM, and older ones are dropped.

The trade is real. A dropdown or a dialog that opened a portal and relied on unmounting to close it needs to handle being
hidden. The docs call this out as a small set of patterns to check, and it is worth testing your own.

If you want a component that *does* re-mount on every navigation, use `template.tsx`: it is a layout that renders fresh
each time, which is what you want for a scroll tracker or an entrance animation.

## Metadata belongs to the layout too

```tsx
export const metadata: Metadata = {
  title: {
    default: "Northside Library",
    template: "%s | Northside Library",
  },
  description: "A catalogue, a desk and a waiting list, built with the Next.js App Router.",
};
```

A page's title then inherits the template, which is visible on any page of the running application:

```text
/loans          Desk | Northside Library
/books/dune     Dune | Northside Library
```

The desk page sets only `title: "Desk"` and gets the suffix for free.

## What not to put in a layout

A layout should hold what is true for every URL below it. Two things look like they belong there and do not:

- **per-page data.** A layout cannot see the page's params, so "the current book" is not available to it. Fetch it in the
  page, or in a component the page renders.
- **a redirect based on the request.** That is what the proxy is for, and it runs before any of this.

## Check yourself

Add a layout under `/books` that renders a bar of genres linking to `/books?genre=poetry` and the other genres. Then
navigate from the catalogue to a book and back, and check in the browser's network tab how many times the layout's markup
is sent from the server.
