---
title: Refs and escape hatches
summary: A ref is a box that survives renders, and the DOM is one of the things worth putting in one.
chapter: State and events
minutes: 12
status: draft
---

## A value that does not render

```tsx
const renders = useRef(0);
renders.current += 1;
```

```tsx
const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

function start(): void {
  timer.current = setTimeout(() => setStatus('done'), 2000);
}

function stop(): void {
  clearTimeout(timer.current);
}
```

`useRef` returns an object with one property, `current`, that keeps its value for the life of the component.
Changing it does not render anything, which is the difference from state and the reason it exists:

- a timer id, an interval, a connection, anything a cleanup needs to find again
- a value from the previous render, where comparing now with then is the point
- a mutable flag for a measurement or a debugging aid

I used the last kind while writing this course. A counter in a module and a component that increments it is
exactly what a ref is for:

```tsx
let renders = 0;

export function ShelfSummary({ books }: ShelfSummaryProps) {
  renders += 1;

  return <p className="summary">{books.length} titles. <span>renders {renders}</span></p>;
}
```

That probe is how the compiler page measures what the compiler does. It is on its way out of the project by
the end of that page, because a render counter is a thermometer rather than a feature.

## The DOM, kept in a ref

```tsx
const field = useRef<HTMLInputElement>(null);

useEffect(() => {
  field.current?.focus();
}, []);

return <input ref={field} />;
```

A `ref` on an element is filled in after React has created the node. Reading `field.current` before that
gives `null`, which is why the focus call lives in an effect and why the type includes `null`. In React 19
`ref` is an ordinary prop, so a component that forwards one accepts it as a prop, with no wrapper:

```tsx
interface FieldProps {
  readonly label: string;
  readonly ref?: Ref<HTMLInputElement>;
}

export function Field({ label, ref }: FieldProps) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}
```

`forwardRef` still compiles in React 19 and is no longer needed. The older string refs and the
`ref`-on-a-function-component error are gone.
## When not to reach for a ref

A ref is an escape hatch, and the word escape is the warning. Three patterns that should be state or props
instead:

```tsx
// a value the interface shows
count.current += 1;              // wrong: nothing renders
setCount((value) => value + 1);  // right

// copies of props or state
lastBook.current = book;         // wrong: derived from a prop, so derive it during the render

// passing data to a child
childRef.current.setState(x);    // wrong: pass a prop
```

The one case that really needs the DOM is a browser API with no declarative equivalent: focus, selection,
scroll position, `getBoundingClientRect`, and playing or pausing media. Everything else in an interface can
be described, and a description is what React can compare.

## useId for generated ids

```tsx
export function Field({ label }: { readonly label: string }) {
  const id = useId();

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </>
  );
}
```

`useId` gives a stable id that matches between the server render and the browser, which is what an
accessibility attribute needs. A counter or `Math.random()` produces a mismatch, and React reports it during
hydration rather than fixing it silently.

## A ref for the previous value

```tsx
export function usePrevious<T>(value: T): T | undefined {
  const previous = useRef<T | undefined>(undefined);

  useEffect(() => {
    previous.current = value;
  }, [value]);

  return previous.current;
}
```

That is the shape of the pattern, and it is worth reading closely: the ref is written in an effect, so it
holds the value from the render before this one, and the value is returned during the render. Writing to a
ref during a render would break the rule that a render is pure, which the compiler and the linter both
check.

## Check yourself

Add a `Field` component that focuses its input when a button is pressed, using a ref, and write the same
thing with `autoFocus` instead. Then explain to yourself which of the two you would ship, and why the second
one is not usable for a field that is already on screen.
