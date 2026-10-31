---
title: What React is
summary: A rendering library with two packages, a compiler and no opinions about routing or data.
chapter: Getting started
minutes: 13
status: draft
---

## Two packages, one job

A new project installs React and ReactDOM:

```json
"dependencies": {
  "react": "^19.3.1",
  "react-dom": "^19.3.1"
}
```

The split matters. `react` holds the component model: what a component is, how state is stored, how the
tree is described. `react-dom` turns that description into DOM nodes, and the browser is only one of the
places it can go. `react-dom/server` renders the same components to an HTML string for the server, and
React Native renders them to native views.

Everything else lives outside. A router, a data fetching library, a test runner and a form library are
separate packages that you pick. That is the trade: the library is small, and the decisions about how an
application is put together are yours to make and to justify.

## JSX is a function call

```tsx
function BookList({ books }: { readonly books: readonly Book[] }) {
  return (
    <ul className="books">
      {books.map((book) => (
        <li key={book.id}>{book.title}</li>
      ))}
    </ul>
  );
}
```

Nothing in a browser understands that file. The compiler turns each element into a call:

```ts
const element = jsx('ul', { className: 'books', children: books.map((book) => jsx('li', { key: book.id, children: book.title })) });
```

The result is a plain object describing what should exist. React keeps the last one, builds the next one,
and works out the difference. Everything surprising about React comes from that comparison rather than
from the syntax: an element is not a DOM node, and re-running a component is not the same as rebuilding
the page.

## A component is a function

```tsx
export function ShelfSummary({ books }: { readonly books: readonly Book[] }) {
  const copies = books.reduce((total, book) => total + book.copies, 0);

  return (
    <p>
      {books.length} titles, {copies} copies on the shelf.
    </p>
  );
}
```

Rules that follow from that:

- It takes one argument, the props, and returns what to render.
- It runs again whenever its props or its state change. React decides when.
- It should be pure: the same props give the same output, and it does not write to anything outside
  itself while rendering. A component that mutates a variable while rendering breaks the comparison.
- Its name starts with a capital letter, because the compiler uses the name to tell a component from an
  HTML tag.

## React 19 is the release this course is written against

Three changes from that release shape the later pages:

- **Actions.** A `<form>` takes an async function, and React manages the pending state, the error state
  and the optimistic update that goes with it. `useActionState`, `useOptimistic` and `useFormStatus` are
  the hooks around it.
- **`use`.** A component can read a promise that some other code started, and React suspends and resumes
  it. This is the API that makes a loader and a component fit together without an effect.
- **The compiler.** A build step that inserts the memoization people used to write by hand. It reached
  1.0 alongside React 19, and the performance chapter measures what it does in this project.

`ref` is also an ordinary prop now, so `forwardRef` is no longer needed, and string refs and legacy
lifecycles are gone.

## What React does not do

| Need | Where it comes from |
| --- | --- |
| routing | `react-router` or another router |
| data fetching | `fetch`, a library such as TanStack Query, or an action |
| forms | browser form elements, plus the action APIs |
| styling | CSS, CSS modules, or a CSS in JS library |
| server rendering | `react-dom/server` plus a server you write or a framework |
| tests | Vitest with Testing Library |

The catalogue in this course uses `react-router` for the first three, and the pages say why at each step.

## Check yourself

Open a project with React installed and print `typeof document.createElement` next to
`typeof createRoot` to see which package each one comes from. Then add a component that returns two
sibling elements without a wrapper and read the compiler's error, and fix it with a fragment.
