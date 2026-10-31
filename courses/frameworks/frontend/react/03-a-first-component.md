---
title: A first component
summary: The generated counter taken apart, with props, the render, and why the component runs twice in development.
chapter: Getting started
minutes: 12
status: draft
---

## The counter the scaffolder writes

```tsx
import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Get started</h1>
      <button type="button" className="counter" onClick={() => setCount((count) => count + 1)}>
        Count is {count}
      </button>
    </>
  )
}

export default App
```

Read it as three things:

- `useState(0)` stores a value between renders and hands back the value and a setter.
- The function returns what should be on screen. It runs again after the setter is called, and this time
  `count` is one higher.
- The click handler is a function, not a string. React attaches it with `addEventListener` rather than
  writing an attribute into the document.

## Props are the argument

```tsx
interface ShelfSummaryProps {
  readonly books: readonly Book[];
}

export function ShelfSummary({ books }: ShelfSummaryProps) {
  const copies = books.reduce((total, book) => total + book.copies, 0);

  return (
    <p>
      {books.length} titles, {copies} copies on the shelf.
    </p>
  );
}
```

A component takes one object and destructures what it needs. The interface is not required by React, and
it is the reason a mistake at the call site is a compile error:

```tsx
<ShelfSummary books={books} />
<ShelfSummary /> // Property 'books' is missing in type '{}'
```

`readonly` on the props is the house style here. A component that receives an array should not sort it in
place, and the compiler refuses to let it.

## Imports, exports and file names

```tsx
export function BookList() { /* ... */ }
export function BookDetail() { /* ... */ }
```

```tsx
import { BookList } from './library/BookList';
import { BookDetail } from './library/BookDetail';
```

Two conventions, both worth picking and keeping:

- `export function` with the name in the declaration. A default export can be renamed by whoever imports
  it, and a search for the name finds the definition.
- One component per file, named after the component, in the folder for the feature. The scaffolder's
  `App.tsx` is the exception, because it is the entry point rather than a feature.

The template uses `export default App` for that entry point, and `main.tsx` imports it as `App` from
`./App.tsx`. Either style works; mixing both in one project is what causes the churn.

## Composition is the whole design

```tsx
export function BookDetail({ book, onWant }: BookDetailProps) {
  return (
    <section>
      <h1>{book.title}</h1>
      <ShelfSummary books={[book]} />
      <button type="button" onClick={onWant}>
        Add to the waiting list
      </button>
    </section>
  );
}
```

There is no inheritance, no base class and no template language to learn. A component renders other
components, passes them data through props, and passes behaviour up through functions it was given. When
two pages need the same box, the box becomes a component with a `children` prop:

```tsx
export function Panel({ heading, children }: { readonly heading: string; readonly children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{heading}</h2>
      {children}
    </section>
  );
}
```

## Why the same component runs twice

`StrictMode` in `main.tsx` is deliberate: in development React renders each component twice, discards the
first result, and runs each effect twice. It is a rehearsal for the second render that a real application
performs when state changes, and it catches a component that writes to something outside itself while
rendering. The counter above shows the same number twice because the discarded render changed nothing
that survives.

The scaffolded project counts renders honestly. A probe component that increments a counter while it
renders shows the doubling:

```tsx
let renders = 0;

export function ShelfSummary({ books }: ShelfSummaryProps) {
  renders += 1;
  return <p>renders {renders}</p>;
}
```

That counter is a measurement tool rather than production code, which is why the performance chapter
deletes it again. What matters here is that a render count measured in development is roughly double
what a production build does, so a number that looks wrong in dev usually is not.

## Check yourself

Take the scaffolded `App.tsx` apart. Move the counter into its own component that takes `label` and
`initial` props, keep the state in `App`, and pass the setter down as a prop. Then delete the interface
from the props while leaving the usage in place and read the compiler's message.
