---
title: Memo, useMemo and useCallback
summary: The three manual tools, what each one does, and why the compiler makes two of them optional.
chapter: Performance
minutes: 13
status: draft
---

## Three tools with three different jobs

| Hook or function | Keeps | Stops |
| --- | --- | --- |
| `memo(Component)` | the render output for unchanged props | the component body running |
| `useMemo(fn, deps)` | the value `fn` returned | the calculation running again |
| `useCallback(fn, deps)` | the function identity | a child or an effect seeing a new function |

They are often reached for together and they solve different problems. `memo` is about a component not
rendering, `useMemo` is about arithmetic, and `useCallback` is about identity, which matters because
`Object.is` decides whether an effect re-runs or a memoized child re-renders.

The React Compiler inserts all three, which changes the advice: write them by hand where they document
something, and leave them out where they only repeat what the compiler would do. The measurements on the last
two pages are the reason this project has a compiled build and a small number of explicit memos rather than
memos everywhere.

## memo around a component

```tsx
import { memo } from 'react';

export const BookRow = memo(function BookRow({ book }: { readonly book: Book }) {
  return (
    <li>
      <Link to={`/books/${book.id}`}>{book.title}</Link> by {book.author}
    </li>
  );
});
```

`memo` compares the props with `Object.is` and reuses the last output when they are all equal. Two things make
it useless in practice:

- A prop that is a new object, array or function on every render defeats the comparison, and the child renders
  anyway with extra work on top.
- A list of rows where the parent passes an inline arrow as a callback is the classic case. `useCallback` on the
  callback, or the compiler, is what makes `memo` do anything.

In this project the rows are not wrapped in `memo`, because the compiler memoizes the element the parent
creates. That is the point worth taking from the table on the compiler page: no `memo`, no extra renders.

## useMemo for a calculation

```tsx
const visible = useMemo(
  () => books.filter((book) => (genre === 'all' || book.genre === genre) && matches(book, term)),
  [books, genre, term],
);
```

```tsx
const visible = books.filter((book) => (genre === 'all' || book.genre === genre) && matches(book, term));
```

The second one is what the catalogue ships, and for a list of four books it is the better line: the filter is
microseconds, and a `useMemo` adds an array and a comparison to maintain. The first becomes worth it when the
calculation is measurably slow, which for a list means tens of thousands of rows or a filter that does real
work per item:

```tsx
const sorted = useMemo(() => [...rows].sort(compare), [rows, compare]);
```

A sort on every render of a large table is the case `useMemo` exists for. The dependency array is also the part
people get wrong, and a missing entry is a stale value rather than a warning:

```tsx
useMemo(() => rows.filter((row) => row.genre === genre), [rows]); // genre is read and not listed
```

## useCallback for identity

```tsx
export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { member: null });

  const signIn = useCallback((member: string) => {
    dispatch({ type: 'signedIn', member });
  }, []);

  const signOut = useCallback(() => {
    dispatch({ type: 'signedOut' });
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ member: state.member, signIn, signOut }),
    [state.member, signIn, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
```

Two identities are being protected here. The handlers, because the memo below lists them as dependencies, and
the value object, because a new context value re-renders every consumer in the tree. Without those three lines,
every render of the provider re-renders every component that reads the session, which in this application is
most of the header.

The three are a case for keeping them by hand even with the compiler enabled: they document that the identity of
the value is part of the contract, and a reviewer can see why.

The other place identity matters is an effect's dependencies:

```tsx
const save = useCallback((value: string) => post(value), []);

useEffect(() => {
  const timer = setTimeout(() => save(draft), 500);
  return () => clearTimeout(timer);
}, [draft, save]);
```

Without the `useCallback`, `save` is a new function on every render, the effect re-runs on every render, and the
debounced save fires on every keystroke with a fresh timer. That is the failure that looks like a dependency
array problem and is really an identity problem.

## When not to memoize

- **A cheap calculation.** The comparison and the array allocation can cost more than the work.
- **A component that always receives changing props.** `memo` adds a comparison and skips nothing.
- **Anything you have not measured.** The last page's tools come before this page's hooks, in that order.
- **Everywhere, by reflex.** A codebase where every function is a `useCallback` is harder to read, and the
  dependency arrays become the place bugs live.

## Check yourself

Take the `BookRow` component, wrap it in `memo`, and count the renders while typing in the search box. Then
pass an inline arrow as a prop, count again, and explain the difference. Finally, enable the compiler and
remove both the memo and the arrow's `useCallback`, and see whether the count changes.
