---
title: Forms and useActionState
summary: One hook for the action's answer, one for the submit button, and what each of them gives you.
chapter: Mutations
minutes: 13
status: draft
---

## The form

```tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { recordLoanAction, type FormState } from "@/app/actions";

export function LoanForm({ bookId, available }: { bookId: string; available: number }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(recordLoanAction, {});

  return (
    <form className="stack" action={formAction} aria-busy={isPending}>
      {state.error ? (
        <p className="errors" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.notice ? (
        <p className="notice" role="status">
          {state.notice}
        </p>
      ) : null}

      <input type="hidden" name="bookId" value={bookId} />

      <p>
        <label htmlFor="member">Member name</label>
        <input id="member" name="member" defaultValue={state.member ?? ""} required minLength={3} />
      </p>

      <SubmitButton unavailable={available === 0} />
    </form>
  );
}
```

`useActionState` returns three things, and each has a job:

| Value | Use |
| --- | --- |
| `state` | whatever the action returned, on the render after it did |
| `formAction` | pass to the form's `action` prop |
| `isPending` | true while the action is in flight |

The action's signature is `(previousState, formData)`, and the first argument is where the state comes back in. Returning a
value from an action is how the UI learns the outcome without a client state library.

## The button in its own component

```tsx
function SubmitButton({ unavailable }: { unavailable: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending || unavailable}>
      {pending ? "Recording..." : "Record loan"}
    </button>
  );
}
```

`useFormStatus` reads the state of the form it is *inside*, which is why the button is a separate component: called in the
same function as the `<form>`, it would report the state of a form that does not exist yet. Two hooks, one rule.

The pending state is not decoration. A button that says "Recording..." and cannot be pressed twice is what stops a double
submission from becoming two loans, and `disabled` makes it work for a person using a keyboard as well as a mouse.

## Two places for state, one place for the truth

```text
isPending   the request in flight
state       the answer once it is back
```

`state.error` and `state.notice` come from the server, so the message a visitor reads is the same message the action wrote.
The alternative, deciding the message on the client, means two sets of rules that drift, and the second set is the one the
visitor sees.

## Bringing back what was typed

```tsx
<input id="member" name="member" defaultValue={state.member ?? ""} required minLength={3} />
```

A form that clears itself on error is a small cruelty. The action returned `state.member`, so the field is filled in again
and the visitor fixes one thing rather than retyping everything. On success the action returns no member, so the field
clears, which is the behaviour a librarian wants at the end of a transaction.

`defaultValue` rather than `value` is deliberate: an uncontrolled input keeps working while the JavaScript is still
arriving, and the server is still the one deciding what the value should be.

## Progressive enhancement

A form with an action on it posts before hydration and keeps working if hydration fails:

1. The browser submits the form to the current URL as a POST.
2. The server runs the action.
3. The response is a normal HTML page with whatever the action changed.

With JavaScript, the same submit goes through React instead: no reload, the pending state, and the action's return value
rendered in place. Nothing in the component has to change for the first version to work, which is why the pattern is worth
preferring over an `onSubmit` handler even in an application that has JavaScript everywhere.

## The hidden field

```tsx
<input type="hidden" name="bookId" value={bookId} />
```

The book id is not typed by anybody and has to reach the action, so it goes in the form. A hidden input is readable and
editable in a browser, and that is fine: the action validates it, and the check inside the action is the rule. Where the
value should not be tamperable at all, it is derived on the server from something that is, such as a session, rather than
passed from the client.

## Check yourself

Add a `days` field with a select of 7, 14 and 28 days and make the action reject anything else. Then submit an invalid value
by editing the select's value in the browser's inspector and confirm the server refuses it, and say which of the two
validations you would remove if you had to keep one.
