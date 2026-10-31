---
title: Server and client components
summary: The default is the server, the directive is 'use client', and what may cross the boundary.
chapter: Getting started
minutes: 15
status: draft
---

## Two kinds of component

Every component is a server component unless its file, or a file it imports from, starts with `'use client'`.

| A server component may | A client component may |
| --- | --- |
| read a database or a file | keep state with `useState` |
| use a secret from the environment | run effects |
| `await` a fetch | handle a click |
| check a cookie | use a browser API |
| import a heavy library without shipping it | use a ref to a DOM node |

The list is not a suggestion. A server component cannot use `useState`, and a client component cannot read the file
system, and the framework tells you which one you wrote rather than guessing.

## The directive marks a boundary

```tsx
"use client";

import { useSearchParams } from "next/navigation";

export function SearchForm() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return (
    <form className="filters" action="/books" method="get">
      <input id="q" name="q" type="search" defaultValue={q} />
      <button type="submit">Filter</button>
    </form>
  );
}
```

One line at the top, and everything this file imports joins it in the client bundle. That is why the directive belongs at
the edge of the tree: put it on a page and the page's whole subtree is client-side, put it on one form and one form is.

In this application exactly three files carry it: the search form, the loan form and the waiting list. Everything else,
including every page, is server-rendered.

## Rendered on the server, then hydrated

`'use client'` does not mean "rendered only in the browser". A client component's HTML is produced on the server for the
first paint and then hydrated. The evidence is in the response body of the catalogue page from the production server:

```html
<form class="filters" action="/books" method="get">
  <label for="q">Search the catalogue</label>
  <input id="q" name="q" type="search" placeholder="title or author" value=""/>
```

That is `SearchForm`, a client component, in the HTML a browser with JavaScript switched off would see. The bundle it
needs arrives afterwards and attaches the behaviour.

## What may cross the boundary

A server component can pass props to a client component, and every prop has to survive being serialised:

| Prop | Crosses |
| --- | --- |
| strings, numbers, booleans, null | yes |
| arrays and plain objects of those | yes |
| a promise | yes, and the client can `use()` it |
| a `Date` | yes |
| a function | no, unless it is a server function |
| a class instance with methods | no |

The application's book page passes an array of plain objects to the waiting list:

```tsx
<WaitingList
  bookId={book.id}
  entries={waiting.map((entry) => ({ id: entry.id, memberName: entry.memberName }))}
/>
```

The map is doing real work there. `waiting` is an array of records straight out of the data layer, and mapping it to two
plain fields keeps the prop serialisable and keeps the client component from depending on the shape of a server type.
server type.

## Children as a slot

A server component can be rendered *inside* a client component, which is how a client wrapper stays small:

```tsx
"use client";

export function Panel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return <section onClick={() => setOpen(!open)}>{open ? children : null}</section>;
}
```

```tsx
<Panel>
  <BookTable books={books} />
</Panel>
```

`BookTable` never becomes a client component: it was rendered on the server and handed over as already-built output.
The directive applies to the file that has it, not to what is passed to it.

## The server-only marker

```ts
import "server-only";

export function recordLoan(input: { bookId: string; member: string; days: number }): Result<Loan> {
```

An import of `server-only` at the top of a module makes it an error to import that module from a client component. It is
the guard rail for the data layer in this application, and it is also why the test setup needs a stub: a test runner is
not a server component build, so it resolves the marker to an empty file.

The opposite marker exists too. `client-only` protects a module that touches the browser, and it is rarely needed because
an accidental import of a browser API fails loudly enough on its own.

## Check yourself

Take one component in your application that has no state and mark it `'use client'`, then run `next build` and compare
the client bundle size with the previous build. Then pass a function from a server component to a client component and
read the error, which names the prop and the reason.
