---
title: Actions and optimistic updates
summary: useActionState for a form that updates in place, and the count that moves before the request lands.
chapter: Forms and actions
minutes: 15
status: draft
---

## The waiting list in full

```tsx
import { use, useActionState, useOptimistic } from 'react';

interface WaitingState {
  readonly waiting: number;
  readonly message: string | null;
}

export function WaitingList({ genre, waiting }: WaitingListProps) {
  const backlog = use(waiting);

  const [state, join, joining] = useActionState<WaitingState, FormData>(submit, {
    waiting: backlog.waiting,
    message: null,
  });

  const [optimisticWaiting, addOptimistic] = useOptimistic(
    state.waiting,
    (value: number, increment: number) => value + increment,
  );

  /** The action the form submits to, declared after the hooks it reaches. */
  async function submit(current: WaitingState, formData: FormData): Promise<WaitingState> {
    const member = String(formData.get('member') ?? '').trim();

    // The optimistic count is applied inside the action, and is dropped again
    // when the action returns the server's number.
    addOptimistic(1);

    if (member.length < 3) {
      return { ...current, message: 'Enter the member name.' };
    }

    const next = await requestWaitingList(member, genre);
    return { waiting: next.waiting, message: `${member} is on the list.` };
  }

  return (
    <section className="waiting">
      <p>
        <strong>{optimisticWaiting}</strong>{' '}
        {optimisticWaiting === 1 ? 'borrower is' : 'borrowers are'} waiting for {genreLabel(genre)}
        {joining && <span className="pending"> (saving)</span>}
      </p>

      <form action={join}>
        <label htmlFor="waiting-member">Your name</label>
        <input id="waiting-member" name="member" autoComplete="name" />

        <button type="submit" disabled={joining}>
          {joining ? 'Joining' : 'Join the waiting list'}
        </button>
      </form>

      {state.message !== null && <p role="status">{state.message}</p>}
    </section>
  );
}
```

Four APIs in one component, and each answers a different question.

## useActionState

```tsx
const [state, join, joining] = useActionState<WaitingState, FormData>(submit, {
  waiting: backlog.waiting,
  message: null,
});
```

The action is `(currentState, payload) => Promise<nextState>`, so the state is explicit and the payload is
whatever the form sends, which is a `FormData`. The hook hands back the current state, a function to submit,
and whether a submission is in flight.

A validation failure is a returned state rather than a thrown error:

```ts
if (member.length < 3) {
  return { ...current, message: 'Enter the member name.' };
}
```

That is the same shape as the router's action returning `{ errors }`, without the router. The difference in
practice: `useActionState` is for a form that updates part of a page in place, and a route action is for a form
whose result is a new page.

## The form's action is the dispatch

```tsx
<form action={join}>
```

React recognises an action function on a `<form>` and manages the submission itself: it prevents the default,
collects the `FormData`, calls the action inside a transition, and tracks the pending state. Passing the
dispatch directly means React supplies the payload, which is why `submit` receives a `FormData` rather than
being called with one by hand.

## useOptimistic

```tsx
const [optimisticWaiting, addOptimistic] = useOptimistic(
  state.waiting,
  (value: number, increment: number) => value + increment,
);

async function submit(current: WaitingState, formData: FormData): Promise<WaitingState> {
  addOptimistic(1);
  // ...
}
```

`useOptimistic` takes the value that is true now and a function that says how a pending change looks. Calling
the updater inside the action shows that value straight away, and React reverts to the real value when the
action settles: the optimistic value is never stored, it is the difference that the pending action explains.

Two consequences worth understanding before using it:

- The updater has to run inside an action or a transition. Calling it from a click handler with neither is an
  error, because the value has to be tied to work that is actually pending.
- The optimistic value is dropped when the action returns, whether it succeeded or not. A failed validation
  therefore reverts the count *and* shows the message, which is what a person expects from a form that refused
  their input.

The test that pins the behaviour shows both numbers in one run:

```ts
await user.type(screen.getByLabelText('Your name'), 'Ada Lovelace');
await user.click(screen.getByRole('button', { name: 'Join the waiting list' }));

// The optimistic value, while the POST is still open.
expect(countParagraph()).toHaveTextContent('3 borrowers are waiting for Poetry');

await act(async () => {
  post.resolve({ genre: 'poetry', waiting: 9 });
});

expect(await screen.findByText('Ada Lovelace is on the list.')).toBeInTheDocument();
expect(countParagraph()).toHaveTextContent('9 borrowers are waiting for Poetry');
```

The count goes from 2 to 3 on the click, and to 9 when the server answers with 9. A stub that answered with 3
in both places would let the test pass whether or not the optimistic update did anything, which is why the
number the server returns here is different from the optimistic guess.

## The declaration order the linter cares about

The first version of this component passed an inline arrow function to `useActionState` that called
`addOptimistic`, and the linter reported it:

```text
`addOptimistic` is read during its own initialization. Move the access after initialization. For a
recursive callback, use a named function expression or restructure the callback so it does not capture
itself during initialization.
```

The arrow function was created while `addOptimistic` was still being initialised on the line below, and the
compiler refused to optimise the component because of it. Moving the action into a function declaration under
both hooks fixes the order: a function declaration is hoisted, so `useActionState` can receive it, and the call
happens long after `addOptimistic` exists. That is the shape the React documentation uses too.

## useFormStatus

A child component inside a form can read the submission state without a prop:

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving' : 'Save'}
    </button>
  );
}
```

That is useful when the button is a shared component several forms use, and unnecessary when the component
already has the `joining` flag from `useActionState`. It has to be rendered inside the form rather than
alongside it, which is the mistake that makes it always report `false`.

## Check yourself

Add a second action to the waiting list that removes a name, with its own optimistic update, and make the two
share the same count. Then break the request on purpose, submit, and confirm the count goes back and the
message explains what happened.
