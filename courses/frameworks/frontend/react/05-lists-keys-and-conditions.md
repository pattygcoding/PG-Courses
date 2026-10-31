---
title: Lists, keys and conditions
summary: A key is identity rather than an index, and the catalogue's filter is derived rather than stored.
chapter: Getting started
minutes: 13
status: draft
---

## The list the catalogue renders

```tsx
const genres = [...new Set(books.map((book) => book.genre))].sort();
const visible = books.filter(
  (book) => (genre === 'all' || book.genre === genre) && matches(book, deferredTerm),
);

return (
  <>
    <p>
      {visible.length} of {books.length} books
    </p>

    <ul className="books">
      {visible.map((book) => (
        <li key={book.id}>
          <Link to={`/books/${book.id}`}>{book.title}</Link> by {book.author}
          <span className="genre"> {genreLabel(book.genre)}</span>
        </li>
      ))}
      {visible.length === 0 && <li>No book matches "{deferredTerm}".</li>}
    </ul>
  </>
);
```

Two derived values and one list. `visible` is computed during the render from `books`, the term and the
genre, and there is no state holding a filtered copy. That is the rule this course keeps returning to: a
value that can be computed from other values should be computed, because a copy has to be kept in step and
eventually will not be.

`new Set(...)` is what makes the genre list unique, and `.sort()` on the new array is what makes the
order stable. Sorting `books` in place would change the prop, which is the mistake the `readonly` types
in this project exist to prevent.

## A key is identity

React compares the new list with the previous one and needs to know which row is which. The `key` is that
answer:

```tsx
{visible.map((book) => <li key={book.id}>{book.title}</li>)}
```

The key is not passed to the component and does not appear in the DOM. It is read by React during the
comparison and never again, which is why it cannot be used as data.

Two mistakes follow from getting it wrong:

```tsx
{books.map((book, index) => <li key={index}>{book.title}</li>)}
```

An index key is a position rather than an identity. Remove the first book from that list and every
remaining row has a new index, so React matches row 1 with what used to be row 2, and any state inside a
row (a focus, an input value, an open menu) stays with the position rather than the book. With ids, rows
keep their identity and React moves the nodes instead of rewriting them.

```tsx
{books.map((book) => <li>{book.title}</li>)}
```

A missing key is a runtime warning in the console and a lint error in a project with the React rules
enabled. It is easy to add later and much harder to debug, because a list without keys still renders.

Keys only need to be unique among siblings. Two lists on the same page can each have a `key={1}`, and a
key does not have to be a string.

## Empty states belong in the same expression

```tsx
{visible.length === 0 && <li>No book matches "{deferredTerm}".</li>}
```

Putting the empty state next to the list keeps the two in one place, and it means the case is handled when
the filter changes rather than when somebody notices a blank box. The same shape covers a table with no
rows, a chart with no data, and a search that matched nothing.

## Conditional rendering, three ways

```tsx
// a value that may be missing
function BookCount({ books }: { readonly books: readonly Book[] }) {
  if (books.length === 0) {
    return <p>Nothing on the shelf yet.</p>;
  }

  return <p>{books.length} titles</p>;
}
```

```tsx
// a small branch inside a larger tree
{loading ? <Spinner /> : <List books={books} />}
```

```tsx
// a branch that only adds something when it is true
{error !== null && <p role="alert">{error}</p>}
```

An early return is the clearest form when the whole component depends on the condition. A ternary is
right when both branches are wanted. `&&` is right when nothing should render in the false case, with the
number trap from the last page in mind.

## Extracting a row

A row that grows two or three lines becomes its own component, and the key stays with the element:

```tsx
export function BookRow({ book }: { readonly book: Book }) {
  return (
    <li>
      <Link to={`/books/${book.id}`}>{book.title}</Link> by {book.author}
    </li>
  );
}
```

```tsx
{visible.map((book) => (
  <BookRow key={book.id} book={book} />
))}
```

The key stays at the call site rather than inside the row, because it belongs to the list rather than to
the item.

## Check yourself

Add a "sort by title" control to the catalogue and work out why the sort has to produce a new array. Then
give the list an index key, add a text input to each row, sort the list, and watch what happens to what
you typed.
