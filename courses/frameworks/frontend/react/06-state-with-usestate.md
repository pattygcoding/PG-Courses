---
title: State with useState
summary: State is a snapshot for one render, and the setter is a request rather than an assignment.
chapter: State and events
minutes: 14
status: draft
---

## The hook

```tsx
import { useState } from 'react';

export function BookList() {
  const [term, setTerm] = useState('');
  const [genre, setGenre] = useState('all');

  return (
    <input value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Search" />
  );
}
```

`useState` takes the initial value and returns a pair: the value for this render, and a function that asks
React for another one. Calling the setter does not change `term` in the code that is running; it schedules
a render in which `useState` returns the new value.

That distinction explains the mistake everyone makes once:

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  function addTwice() {
    setCount(count + 1);
    setCount(count + 1);
    console.log(count); // still the value from this render
  }

  return <button onClick={addTwice}>{count}</button>;
}
```

Three reads of a stale value. Each call passes `count + 1` from the render that is running, so the counter
goes up by one, and the `console.log` prints the value from before both calls. React batches the two
updates into one render, which is why nothing appears to happen twice.

## The updater form

```tsx
function addTwice() {
  setCount((current) => current + 1);
  setCount((current) => current + 1);
}
```

An updater receives the latest value rather than the one from the render, so both calls count and the total
goes up by two. The rule I follow: if the new value depends on the old one, use the updater. It removes a
whole class of bug around batching, handlers that fire in the same tick, and state read inside an interval.

## Batched, then committed

```tsx
function update() {
  setTerm('dune');
  setGenre('science-fiction');
}
```

Both setters run, one render happens, and the DOM is updated once. React batches everything in one event
handler, in one promise callback, and in one effect, and the page only sees the committed result. This is
why a component that reads two pieces of state never renders with one of them updated and the other not.

## Arrays and objects are replaced

```tsx
const [books, setBooks] = useState<readonly Book[]>([]);

setBooks([...books, book]);                        // a new array
setBooks(books.filter((item) => item.id !== id));  // a new array
setBooks(books.map((item) => (item.id === id ? { ...item, copies: 2 } : item)));
```

```tsx
books.push(book); // the same array, and nothing renders
books[0].title = 'Dune'; // the same object, and nothing renders
```

React compares the previous state with the new one, and for an object or an array that comparison is the
reference. Mutating the value you passed in leaves the reference alone, so React reads the same value and
skips the render. Spread into a new array or a new object and every nested object you change along the way,
which is one line each and removes the class of bug.

## The initializer form

```tsx
const [member, setMember] = useState(() => localStorage.getItem('northside.member') ?? '');
```

Passing a function defers the work to the first render and skips it on every later render. It matters when
the initial value is expensive to compute, and it is required when reading it has a side effect worth doing
once: `read()` in this project's `useLocalStorage` catches a browser that has storage turned off, and
running that on every render would be pointless work.

The argument in `useState(0)` is used on the first render only. Changing a prop later does not change state,
which is the subject of the page after next.

## Where state lives

```tsx
let term = ''; // outside the component: shared by every copy, and not a re-render
```

A module level variable looks like state and is not. React does not know about it, so writing to it does not
render, and every copy of the component shares the one value. Anything the interface needs to remember
belongs in `useState`, in a ref, or somewhere React is told about.

The other half of the rule is that a value which can be computed does not deserve state:

```tsx
const visible = books.filter((book) => matches(book, term));
```

A `filteredBooks` state entry kept in step with `books` and `term` is three values to keep consistent
instead of two, and the third one will be wrong at some point. Compute it during the render.

## Check yourself

Write a component with a list in state and two buttons, one that appends with a spread and one that appends
with `push`. Watch which one renders. Then change the append to set the same array twice in one handler and
work out why only one render happens.
