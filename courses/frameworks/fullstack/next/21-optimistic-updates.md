---
title: Optimistic updates
summary: Show the visitor their own change while the server is still deciding, then correct it from the props.
chapter: Mutations
minutes: 13
status: draft
---

## A form that feels instant

```tsx
"use client";

import { useOptimistic } from "react";

import { joinWaitingListAction } from "@/app/actions";

export function WaitingList({ bookId, entries }: { bookId: string; entries: WaitingEntryView[] }) {
  const [optimistic, addOptimistic] = useOptimistic(entries, (current: WaitingEntryView[], name: string) => [
    ...current,
    { id: `pending-${name}`, memberName: name, pending: true },
  ]);

  async function addEntry(formData: FormData) {
    const name = String(formData.get("memberName") ?? "").trim();

    if (name.length < 3) {
      return;
    }

    addOptimistic(name);

    await joinWaitingListAction(formData);
  }

  return (
    <>
      <p className="count" aria-live="polite">
        {optimistic.length} waiting
      </p>

      <ul className="books">
        {optimistic.map((entry) => (
          <li key={entry.id}>
            {entry.memberName}
            {entry.pending ? <span className="badge">saving...</span> : null}
          </li>
        ))}
      </ul>

      <form className="stack" action={addEntry}>
        <input type="hidden" name="bookId" value={bookId} />
        <input id="memberName" name="memberName" required minLength={3} />
        <button type="submit">Join the waiting list</button>
      </form>
    </>
  );
}
```

`useOptimistic` takes the real value and a function that describes how a change looks before the server has agreed to it. The
list rendered from `optimistic` includes the entry immediately, and the `pending` flag is what marks it as provisional.

## The lifecycle in three steps

```text
1  the visitor submits         addOptimistic(name) runs inside the action
2  the action is in flight     optimistic holds one entry more than entries
3  the action resolves         optimistic is replaced by whatever the server sent
```

Step three is the important one, and it is worth being precise about it. The optimistic value does not merge with the
server's answer. It disappears, and the component renders from the props it was given. If the server's re-render includes the
new entry, the entry stays; if it does not, the entry vanishes.

So the rule is: **the props are the truth, and the optimistic value is a preview of them.** This application's waiting list
keeps the entry because the action invalidates the catalogue tag and the page re-renders with the entry in it. An action that
forgot to revalidate would show the entry for a second and then take it away, which looks like a bug and is really a missing
`updateTag`.

## Why the caller must be an action

```tsx
<form className="stack" action={addEntry}>
```

`addEntry` is a client function that calls `addOptimistic` and then awaits a server function. Passing it to the form's
`action` puts it inside a transition, which is what allows React to show the optimistic state while the request is in flight
and then discard it. Calling `addOptimistic` outside a transition is an error rather than a warning, because React has no
boundary to roll back to.

Where there is no form, the same shape works with an explicit transition:

```tsx
const [isPending, startTransition] = useTransition();

<button
  type="button"
  onClick={() => {
    startTransition(async () => {
      addOptimistic(value);
      await saveAction(value);
    });
  }}
>
  Save
</button>
```

## When to reach for it

| Situation | Optimistic |
| --- | --- |
| the write almost always succeeds | yes, and the page feels immediate |
| the write often fails on a rule | no, the correction is more confusing than a wait |
| the value is computed on the server | only for the parts that are not |
| the write is a step in a longer flow | yes, if the next step does not depend on the result |

The second row is the honest limit. Showing a visitor their change and then removing it teaches them not to trust the page, so
an optimistic path belongs behind a rule that rarely bites.

## Testing it, and what a unit test cannot see

The unit test for this component keeps the action pending forever, which is the only way to hold the optimistic state still
long enough to assert it:

```ts
joinWaitingListAction.mockImplementation(() => new Promise(() => {}));

await user.type(screen.getByLabelText("Your name"), "Grace Hopper");
await user.click(screen.getByRole("button", { name: "Join the waiting list" }));

expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
expect(screen.getByText("saving...")).toBeInTheDocument();
expect(joinWaitingListAction).toHaveBeenCalledTimes(1);
```

What that test does not cover is the step after the action resolves, and the reason is a real limitation worth knowing: in a
test environment a React form action still performs a DOM form submission, so React reports

```text
React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit()
instead.
```

and the outcome is not the one the application produces. The unit test therefore asserts the call and the optimistic state,
and the end-to-end test asserts what the server sends back:

```ts
await expect(page.getByText(name)).toBeVisible();
await page.reload();
await expect(page.getByText(name)).toBeVisible();
```

The reload is the part that proves the server kept it. Splitting the two tests that way is how to test a feature whose
behaviour depends on the server without pretending a component test is an integration test.

## Check yourself

Add an optimistic count to the book page's loan form so the shelf count drops as soon as the librarian submits, and take it
away again when the action returns an error. Then delete the `updateTag` from the action and explain what the visitor sees,
in the order they see it.
