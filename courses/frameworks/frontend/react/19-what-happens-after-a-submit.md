---
title: What happens after a submit
summary: Redirects that carry the result, a form that remembers a failure, and the checks the server still owns.
chapter: Forms and actions
minutes: 12
status: draft
---

## A redirect with the result in it

```ts
const receipt = await requestLoan(loan);

return redirect(
  `/loans/thanks?member=${encodeURIComponent(loan.member)}&dueOn=${receipt.dueOn}`,
);
```

```tsx
export function LoanThanks() {
  const [params] = useSearchParams();
  const member = params.get('member') ?? 'the member';
  const dueOn = params.get('dueOn') ?? 'in two weeks';

  return (
    <section>
      <h1>Loan recorded</h1>
      <p role="status">
        The loan for {member} is due back {dueOn}.
      </p>
      <p>
        <Link to="/books">Back to the catalogue</Link>
      </p>
    </section>
  );
}
```

The redirect is the answer to the oldest form problem there is: after a successful POST, the browser's reload
button must not repeat the POST. A redirect to a GET page makes the reload a reload of the receipt, and the
back button goes to the form rather than to a resubmission.

Putting the confirmation in the query string is the smallest version of "carry the result forward". It has a
cost worth naming: the two values are visible in the URL, and a person can edit them. For a due date that is
fine. For anything that must not be edited, the redirect goes to a page whose loader reads the record:

```ts
return redirect(`/loans/${receipt.id}`);
```

## The same page after a failed submission

```tsx
const result = useActionData() as LoanActionResult | undefined;
const errors = result?.errors ?? {};
const days = result?.loan.days ?? 14;
```

```tsx
<input id="days" name="days" type="number" defaultValue={days} />
<select id="bookId" name="bookId" defaultValue={result?.loan.bookId ?? ''}>
```

When the action returns errors, the router re-renders the same route with the action's data. Every `defaultValue`
reads from that data, so the field the person filled in keeps its value and the fields they never touched show
the defaults. Without it the form resets, which is the failure mode that makes people stop using a form.

The name is also remembered for the next visit, from storage rather than from the action:

```tsx
const [member, setMember] = useLocalStorage('northside.member', '');
```

```tsx
<input id="member" name="member" defaultValue={member} onChange={(event) => setMember(event.target.value)} />
```

A library desk that types the same member name all day is the case for it, and it is also the case that makes
the privacy question real: anything in local storage is on the machine and readable by any script on the page.
A member name is a reasonable thing to remember, a card number is not.

## Validation happens twice, on purpose

```ts
function validate(loan: Loan): LoanErrors {
  if (loan.member.length < 3) {
    errors.member = 'A member name needs at least three characters.';
  }

  if (!Number.isInteger(loan.days) || loan.days < 1 || loan.days > 28) {
    errors.days = 'A loan runs for between 1 and 28 days.';
  }

  return errors;
}
```

That function runs in the action, which means it runs in the browser in this setup. A server that accepts the
loan has to repeat it, for three reasons:

- The browser is not the client. `curl` can post the same body, and nothing in a client can stop it.
- The rules that need the database live there: how many copies are on the shelf, whether this member already
  has the book, whether the account is suspended.
- An error the client could not predict has to come back as data rather than as a 500.

An action that returns a server error is the last piece:

```ts
async function submit(current: WaitingState, formData: FormData): Promise<WaitingState> {
  try {
    const next = await requestWaitingList(member, genre);
    return { waiting: next.waiting, message: `${member} is on the list.` };
  } catch (error) {
    return { ...current, message: 'The waiting list is unavailable. Try again in a minute.' };
  }
}
```

The catch turns a failed request into a message next to the form, with the state it had. That is the difference
between a page that says what happened and one that goes blank.

## The order of the operations

```text
person submits
  -> React or the router collects the FormData
  -> the action validates
  -> the action calls the API
  -> the API validates again and writes
  -> the action returns a redirect, or an error state
  -> the router navigates, runs the new loaders, and renders
```

Every step in that list is a place where something can be slow, and the two visible ones have an answer: the
pending indicator from the router, or the optimistic value from the last page. What should not happen is a
spinner that replaces the form and takes the person's input with it, which is why pending state lives on the
button rather than over the page.

## Check yourself

Make the receipt page read the loan from the API by id instead of from the query string, and give the route a
loader that returns a 404 when the id is unknown. Then make the loan action fail with a 409 conflict and work
out what the form should show, given that the message belongs to a field the person chose.
