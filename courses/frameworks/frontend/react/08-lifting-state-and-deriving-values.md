---
title: Lifting state and deriving values
summary: State goes as low as it can and as high as it must, and everything else is computed from it.
chapter: State and events
minutes: 12
status: draft
---

## The two questions

Every piece of state needs an answer to two questions:

- Which component owns it? The one that needs it, or a parent that passes it down.
- How is it kept in step with everything derived from it? It is not, because the derived values are
  computed during the render.

The catalogue is the example for both. The search term lives in `BookList`, and the filtered list is
computed:

```tsx
export function BookList() {
  const books = useLoaderData() as readonly Book[];
  const [params, setParams] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');

  const deferredTerm = useDeferredValue(term);
  const genre = params.get('genre') ?? 'all';

  const visible = books.filter(
    (book) => (genre === 'all' || book.genre === genre) && matches(book, deferredTerm),
  );
```

`visible` is a local constant. Nobody can set it, because there is nothing to set: it is a function of three
values that already exist. A `filteredBooks` state entry would be a fourth value to keep in step, and the
bug when it drifts is a list that does not match the box.

## State goes as low as it can

`term` is in `BookList` because that is the only component that reads it. The `ShelfSummary` child receives
the book list and never sees the term, so a keystroke does not reach it at all beyond React re-rendering its
parent.

When two siblings need the same value, the state moves to their closest common parent and is passed down as
props:

```tsx
function Catalogue() {
  const [genre, setGenre] = useState('all');

  return (
    <>
      <GenrePicker value={genre} onChange={setGenre} />
      <BookList genre={genre} />
    </>
  );
}
```

That is lifting state up: not a technique to apply broadly, but the answer when a value has two readers.
Pushing it higher than necessary re-renders more of the tree on every change, which is the performance cost
of a state that lives too high.

## Props down, functions up

```tsx
<GenrePicker value={genre} onChange={setGenre} />
```

Passing the setter down is how a child reports a change it noticed. The child does not own the value and
does not try to; it calls `onChange` with the new one. This is the pattern behind every controlled input in
React, including the ones the browser ships.

Two or three levels of that is normal. Ten levels is a signal that the value belongs in a context (next
page) or in the URL.

## The URL is state too

The catalogue keeps the genre and the search term in the query string as well as in state:

```tsx
const [params, setParams] = useSearchParams();
const genre = params.get('genre') ?? 'all';

onChange={(event) => setParams((current) => {
  const next = new URLSearchParams(current);
  if (event.target.value === 'all') {
    next.delete('genre');
  } else {
    next.set('genre', event.target.value);
  }
  return next;
})}
```

The URL already does the job of a shared value: a link to a filtered view can be sent to somebody else, the
back button undoes the filter, and a reload keeps it. A filter is a good fit for the URL. A half typed form
is not, which is why the loan form keeps its draft in a service and its in-progress value in the DOM.

The search term in this project is written to the URL on a delay:

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (term.length === 0) {
        next.delete('q');
      } else {
        next.set('q', term);
      }
      return next;
    }, { replace: true });
  }, 300);

  return () => clearTimeout(timer);
}, [term, setParams]);
```

Three decisions in that effect, and each is a small one worth naming: the delay keeps the history free of
one entry per keystroke, `replace: true` overwrites the current entry rather than pushing a new one, and
the returned cleanup cancels a write that a newer keystroke made pointless.

## Derived values, in one place

```tsx
const genres = [...new Set(books.map((book) => book.genre))].sort();
const visible = books.filter((book) => (genre === 'all' || book.genre === genre) && matches(book, term));
```

Both run during the render, and both are cheap for a list this size. When one is not cheap, the answer is a
memo rather than a state entry, and the performance chapter covers when that is worth it. Until something
is measured as slow, a plain expression is the clearer code.

## What not to do

```tsx
// two sources of truth
const [visible, setVisible] = useState(books);
useEffect(() => setVisible(books.filter(matches)), [books, term]);
```

An effect that copies a derived value into state re-renders once more for every change, and it introduces a
moment where the two disagree. React's documentation calls this out with a rule of its own: if a value can
be calculated from props or state, do not put it in state.

## Check yourself

Move the genre filter from the catalogue into a `GenrePicker` sibling and pass the value down, then check
whether the catalogue re-renders when the path changes but the genre does not. Finally, move the genre into
a context and count the components that re-render, and decide which of the three placements you would ship.
