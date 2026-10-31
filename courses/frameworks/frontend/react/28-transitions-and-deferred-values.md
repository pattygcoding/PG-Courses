---
title: Transitions and deferred values
summary: Two ways to keep typing responsive, and the difference between them in one line of intent.
chapter: Performance
minutes: 13
status: draft
---

## The problem

A controlled input plus a filtered list is the smallest slow interaction in any application. Every keystroke
sets state, every render filters the list, and on a large list the work between the keystroke and the next
paint is long enough to feel. The input itself only needs the new character.

Two hooks solve it, and the choice between them is about who owns the setter.

## useDeferredValue

```tsx
const [term, setTerm] = useState(params.get('q') ?? '');
const deferredTerm = useDeferredValue(term);

const visible = books.filter(
  (book) => (genre === 'all' || book.genre === genre) && matches(book, deferredTerm),
);
```

```tsx
<input id="search" type="search" value={term} onChange={(event) => setTerm(event.target.value)} />
```

The input renders from `term`, which updates immediately. The list renders from `deferredTerm`, which lags
behind: React starts the render with the old value, paints it, and then re-renders with the new one when it has
time. The person sees their character appear at once, and the list catches up a frame later.

`deferredTerm !== term` is how the component knows a catch-up is pending, which is the condition for a subtle
"updating" hint:

```tsx
{deferredTerm !== term && <span className="pending"> filtering</span>}
```

`useDeferredValue` is the right hook when the value comes from somewhere else: a prop, a context, or state
owned by a parent. There is no setter to wrap, so the value is what gets deferred.

## useTransition

```tsx
const [isPending, startTransition] = useTransition();
const [rows, setRows] = useState(initialRows);

function showAll(): void {
  startTransition(() => {
    setRows(buildEveryRow());
  });
}
```

```tsx
<button onClick={showAll} disabled={isPending}>
  {isPending ? 'Building' : 'Show all'}
</button>
```

`startTransition` marks a state update as interruptible. The update still happens and the UI still ends up
correct, but React may interrupt it to handle something more urgent, such as a keystroke, and it reports the
pending state while it does.

The rule that makes it work: the urgent update goes outside the transition and the expensive one inside.

```tsx
// right
onChange={(event) => {
  setTerm(event.target.value);              // urgent, immediate
  startTransition(() => setHighlight(event.target.value)); // expensive, interruptible
}}

// wrong: the input becomes laggy
onChange={(event) => startTransition(() => setTerm(event.target.value))}
```

`useTransition` is the right hook when the component owns the setter, which is the case for the update that
comes from a click or a select of its own.

## They are the same mechanism

```tsx
const [state, join, joining] = useActionState<WaitingState, FormData>(submit, { /* ... */ });
```

An action is a transition. React runs the function passed to `<form action={...}>` and every action state
update inside one, which is why `joining` from `useActionState` and `isPending` from `useTransition` mean the
same thing: work is in flight and it is interruptible. `useOptimistic` also relies on it, because an optimistic
value has to belong to a transition to be tied to the right work.

So the three pages on actions and this one are describing the same mechanism from three angles: a form that
submits, a filter that catches up, and a click that builds something expensive.

## Suspense and transitions together

```tsx
<Suspense fallback={<p>Loading the list...</p>}>
  <BookList books={visible} />
</Suspense>
```

When a component suspends during a transition, React keeps the previous content on screen and does not show the
fallback, because the fallback is for a first load rather than for a change. That is why a router wraps its
navigations in transitions, and why the pending indicator in this project's layout is a line of text rather than
the whole page replaced by a spinner.

## The trade

| Hook | What the person sees | What it costs |
| --- | --- | --- |
| `useDeferredValue` | the input at once, the list a frame later | one extra render, and a brief mismatch |
| `useTransition` | the button disabled with a pending label | the update is interruptible, so it can be restarted |
| neither | both at once, everything waiting on the list | a keystroke that feels slow |

The cost of deferring is a moment where the list does not match the box. For a filter that is correct: the list
is a view of the data, and showing an older view for 50 ms is better than dropping characters. For an input that
drives a validation message, the mismatch is a message that appears a moment late, which is worse than the extra
work. The choice is per interaction rather than per application.

## Check yourself

Wrap the catalogue's filter in `startTransition` and type quickly into the box, and watch how many times the
component renders compared with the deferred version. Then set the deferred value with an initial value of an
empty string, read what that changes about the first render, and decide which of the two you would ship.
