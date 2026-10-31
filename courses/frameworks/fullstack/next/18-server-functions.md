---
title: Server functions
summary: The 'use server' directive marks a function the browser can call, and every one of them is a public endpoint.
chapter: Mutations
minutes: 14
status: draft
---

## A function the client can call

```ts
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";

import { DESK_COOKIE, isDeskOpen } from "@/lib/desk";
import { findBook } from "@/lib/books";
import { dueOn, joinWaitingList, recordLoan } from "@/lib/loans";
```

The directive at the top of a file marks every export as a server function. The same directive works on one function:

```ts
export default function Page() {
  async function createPost(formData: FormData) {
    "use server";
    // ...
  }
}
```

A server function is an async function that runs on the server and that the client can call over the network. React calls
it a Server Function; an action is a server function used with a form or a transition.

## Two ways to call one

```tsx
<form action={formAction}>
  <input name="member" />
  <button type="submit">Record loan</button>
</form>
```

```tsx
<button type="button" onClick={() => startTransition(() => recordLoanAction(state, formData))}>
  Record loan
</button>
```

The first is the one to prefer. An action on a form works before the JavaScript arrives, uses the browser's own submit, and
gives the framework the form's data without a `preventDefault`. The second is for a button that is not a submit, and it needs
`startTransition` because an action is a state update as well as a request.

## Every server function is a public endpoint

This is the sentence to remember from the docs:

> Server Functions are reachable by direct POST requests, not only through your application's UI.

There is no route to configure and no way to make one private. A server function that records a loan can be called by
anybody who can reach the application, with any body they like, and the only thing standing between them and your data is
the check inside the function.

```ts
export async function recordLoanAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await isDeskOpen())) {
    return { error: "Open the desk before recording a loan." };
  }
```

That check is the authorisation for the write, and it is deliberately in the action rather than in the form. Hiding the form
in the UI is presentation; the check is the rule. The rule also ignores the clock: this application has no session, so
"the desk is open" is a cookie, and a real application would resolve the user here and check a permission.

The unit test for this file is written around exactly that, because it is the part a bug would be invisible in:

```ts
test("refuses a loan while the desk is closed", async () => {
  desk.open = false;

  const state = await recordLoanAction({}, form({ bookId: "dune", member: "Ada Lovelace", days: "7" }));

  expect(state).toEqual({ error: "Open the desk before recording a loan." });
});
```

## Validating on the server, twice

The form has attributes, and the action has rules:

```tsx
<input id="member" name="member" defaultValue={state.member ?? ""} required minLength={3} />
```

```ts
if (input.member.trim().length < 3) {
  return { ok: false, error: "A member name needs at least three characters." };
}
```

Both are needed, and they are not the same check. The attribute gives the visitor an answer before a request; the rule gives
the application an invariant. A name of three characters that is *only* three because of a trailing space passes the
browser and fails the server, which is how this application's error path was found:

```text
alert: A member name needs at least three characters.
```

That message arrived from the server, in the borrowed page, next to the input, without a reload.

## What comes back

An action returns a value the client receives, and the framework sends the updated UI in the same response. That is why
recording a loan updates the copy count without a second request, and why the notice can be rendered from the action's own
return value rather than from a client state library:

```ts
updateTag("catalogue");
updateTag("stats");

const book = findBook(bookId);

return {
  notice: `Lent ${book?.title ?? bookId} to ${result.value.member}, due ${dueOn(result.value)}.`,
};
```

The return value has to be serialisable, for the same reason a prop does, and errors are thrown rather than returned when
they are exceptional. A rule that a person broke is a returned message; a database that is down is a throw, and it lands in
the nearest error boundary.

## Cookies and redirects

Two imports come up in nearly every action file:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const store = await cookies();
store.set(DESK_COOKIE, "open", { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });

redirect("/posts");
```

Setting a cookie in an action makes Next.js re-render the current page with the new value, which is what makes the desk
button flip in one roundtrip. `redirect` throws to do its work, so nothing after it runs: revalidate first, then redirect.

## Sequential dispatch

Actions are dispatched one after another rather than in parallel, because two mutations racing each other is not something
the framework can guess the right order for. A form submitted twice therefore behaves, and a batch of independent writes
that has to be fast belongs in one action rather than in several called at once.

## Check yourself

Add a `returnLoanAction` that stamps a return date on a loan, and put the desk check in it. Then call it with a raw POST
from `curl` with no cookie and confirm it refuses, and read the framework's own warning about reaching server functions
outside the UI in the response headers.
