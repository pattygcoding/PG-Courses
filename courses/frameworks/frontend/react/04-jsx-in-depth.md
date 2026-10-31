---
title: JSX in depth
summary: Braces for values, attributes for markup, and the handful of rules the compiler enforces for you.
chapter: Getting started
minutes: 13
status: draft
---

## An expression in braces

```tsx
<p>
  {book.title} by {book.author}, {book.copies} {book.copies === 1 ? 'copy' : 'copies'}
</p>
```

Braces take any expression and put its value in the output. A string next to them is text, so
`{book.title} by {book.author}` needs no concatenation. What cannot go inside the braces is a statement:
`{if (x) ...}` is a syntax error, and an `if` becomes a ternary or a variable above the return.

JSX is an expression itself, which is what allows all of this:

```tsx
const heading = <h1>{book.title}</h1>;
const rows = books.map((book) => <li key={book.id}>{book.title}</li>);

return (
  <section>
    {heading}
    <ul>{rows}</ul>
  </section>
);
```

## Attributes are JavaScript names

```tsx
<label htmlFor="search">Search the catalogue</label>
<input id="search" type="search" value={term} onChange={(event) => setTerm(event.target.value)} />
<div className={genre === 'all' ? 'chip active' : 'chip'} aria-live="polite" tabIndex={0} />
```

The names come from the DOM properties rather than the HTML attributes, which is why it is `className`,
`htmlFor` and `tabIndex`. Three kinds of value are allowed:

| Form | Example | Notes |
| --- | --- | --- |
| a string | `type="search"` | quotes, not braces |
| an expression | `value={term}` | any value, including a function |
| a boolean shorthand | `disabled` | the same as `disabled={true}` |

```tsx
<input id="search" {...rest} />
```

A spread copies every property of an object onto the element. It is how a wrapper component forwards the
props it does not consume, and it is worth keeping visible rather than building a habit of it: a spread
hides which attributes are being passed, including the ones you did not mean to.

## Children

```tsx
<Panel heading="Book details">
  <p>The waiting list is below.</p>
  <WaitingList genre={book.genre} />
</Panel>
```

Everything between the tags arrives as `children`, and a component that accepts it says so:

```tsx
import type { ReactNode } from 'react';

interface PanelProps {
  readonly heading: string;
  readonly children: ReactNode;
}
```

`ReactNode` covers elements, strings, numbers, fragments, `null` and arrays of those. `JSX.Element` is
narrower and is what a function returns; `ReactNode` is what a component accepts.

## Fragments

A component returns one value, so two siblings need a wrapper:

```tsx
function Books() {
  return (
    <>
      <BookList />
      <ShelfSummary books={books} />
    </>
  );
}
```

The short form adds nothing to the DOM. The long form, `<Fragment key={id}>`, is used when a wrapper is
needed inside a list, where the key has to live on something.

## Conditionals, and the zero that renders

```tsx
{visible.length === 0 && <li>No book matches "{term}".</li>}
{error !== null ? <p role="alert">{error}</p> : null}
```

Both are expressions and either is fine. The trap is a number on the left:

```tsx
{visible.length && <p>{visible.length} books</p>} // renders "0" when the list is empty
```

`0 && x` evaluates to `0`, and React renders it. Compare with `visible.length > 0 && ...`, or use the
ternary, and the empty case disappears as intended.

## Comments and whitespace

```tsx
<section>
  {/* a comment inside JSX */}
  <p>Text</p>
</section>
```

A `//` comment inside JSX is a syntax error because the braces are an expression position. On a line of
its own, the block form wrapped in braces works. JSX also collapses whitespace at the edges of lines, so
a deliberate space between two elements needs `{' '}`.

## What the compiler refuses

Four errors worth recognising, because each one points at a real mistake:

```text
Property 'books' is missing in type '{}' but required in type 'ShelfSummaryProps'.
Property 'class' does not exist on type 'JSX.IntrinsicElements'. Did you mean 'className'?
Type '{ children: string; }' is not assignable to type 'IntrinsicAttributes'. Property 'children' does not exist.
'React' must be in scope when using JSX.
```

The first is a missing prop, the second is HTML muscle memory, the third is a component that does not
take children, and the last appears when the JSX runtime is set to the old transform or a file imports
something else as `React`.

## Check yourself

Write a `Chip` component that takes `label`, an optional `onRemove`, and `children`. Use it in two places
with different content, pass a spread of extra attributes to one of them, and then add
`style={{ padding: 4 }}` and work out why the number is fine and the string is not.
