---
title: Custom hooks
summary: A hook is a function that uses other hooks, and the rules that make that safe to do.
chapter: Effects and data
minutes: 13
status: draft
---

## The rules

Three rules, and the compiler and the linter both enforce them:

- A hook is called at the top level of a component or another hook. Not inside a loop, a condition or a
  callback, because React matches hooks to each other by the order they are called in.
- A hook name starts with `use`, so the linter can tell a hook from a function that only looks like one.
- A hook is called while React is rendering, which is what makes it able to reach the state of the component
  it was called from.

The order rule explains the error people meet first:

```tsx
function Broken({ show }: { readonly show: boolean }) {
  if (show) {
    const [count] = useState(0); // React cannot know which state belongs to which hook
  }

  const [term, setTerm] = useState('');
  // ...
}
```

```text
React has detected a change in the order of Hooks called by Broken.
```

The fix is to call the hook unconditionally and use the condition afterwards, or to move the conditional part
into another component. `eslint-plugin-react-hooks` and its equivalent in Oxlint exist for exactly this,
which is why the scaffolded `.oxlintrc.json` enables `react/rules-of-hooks` as an error.

## A hook is a function that composes

```ts
export function useLocalStorage(key: string, fallback: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => read(key, fallback));

  const update = useCallback(
    (next: string) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // The value still works for this page, and nothing is remembered.
      }
    },
    [key],
  );

  return [value, update];
}
```

```ts
export function useSession(): SessionValue {
  const value = useContext(SessionContext);

  if (value === null) {
    throw new Error('useSession must be used inside a SessionProvider');
  }

  return value;
}
```

Both wrap hooks, which is the whole definition. `useLocalStorage` hides the browser API and the failure case;
`useSession` hides the context, its null case and the error message.

The rules move with the hook: a custom hook must be called at the top level of a component, and it inherits
the component's state slots in the order it calls its own hooks. A hook that calls `useState` twice and
`useEffect` once consumes five slots that belong to the component that called it.

## Naming what comes back

```ts
const { report, error, loading, reload } = useReport();
const [member, setMember] = useLocalStorage('northside.member', '');
```

An object with named fields reads better when a hook returns more than two values, and it lets the hook add a
field later without changing every call site. A tuple is right for two values that are always the pair, as
`useState` does: the value and its setter, in the order everybody already knows.

A hook that returns a tuple of three or more invites the caller to write `const [a, b, c] = useThing()` and
forget which is which. Named fields, or two hooks, are clearer.

## When to extract one

The trigger is the second caller, not the first. A hook with one call site is a function that was moved for
tidiness, and it costs a layer of indirection to read.

```tsx
function Reports() {
  const { report, error, loading, reload } = useReport();
  // ...
}
```

```tsx
function Summary() {
  const { report, error, loading, reload } = useReport();
  // ...
}
```

Two components with the same eight lines of state, effect and flags is the moment to extract. The same is
true the other way round: a component with three independent concerns and forty lines of body becomes three
hooks plus a small component, which is the shape the catalogue reaches by the end of the course.

## Composing hooks

```ts
export function useBookSearch(books: readonly Book[]) {
  const [term, setTerm] = useState('');
  const deferredTerm = useDeferredValue(term);

  const visible = books.filter((book) => matches(book, deferredTerm));

  return { term, setTerm, visible, pending: deferredTerm !== term };
}
```

`pending: deferredTerm !== term` is the interesting line: the hook knows that a deferred value lags behind,
and it reports that as a value the caller can render. The caller does not need to know how the lag works.

## Hooks that fetch, subscribe and measure

The catalogue has one of each by the end:

| Hook | Hides |
| --- | --- |
| `useReport` | a request, its three states, cancellation and reload |
| `useSession` | a context, its null case and where it lives |
| `useLocalStorage` | a browser API and the browser that has it turned off |

None of them is longer than forty lines, and each one can be read on its own. That is the test for whether a
hook earns its place.

## Testing a hook

```ts
const { result } = renderHook(() => useLocalStorage('northside.member', ''));

act(() => {
  result.current[1]('Grace Hopper');
});

expect(result.current[0]).toBe('Grace Hopper');
expect(localStorage.getItem('northside.member')).toBe('Grace Hopper');
```

`renderHook` mounts the hook inside a throwaway component, so a hook can be tested without inventing a
component to host it. The testing chapter covers `act` and the async case.

## Check yourself

Extract the debounced URL write from the catalogue into `useDebouncedParams` that takes a value and a delay.
Then write a hook that reports whether the browser tab has focus, with a listener and a cleanup, and test it
with `renderHook`.
