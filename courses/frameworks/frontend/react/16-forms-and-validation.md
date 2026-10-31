---
title: Forms and validation
summary: Messages next to fields, the attributes that tie them together, and the same rules checked twice.
chapter: Forms and actions
minutes: 13
status: draft
---

## The form this course builds

```tsx
export function LoanForm() {
  const books = useLoaderData() as readonly Book[];
  const result = useActionData() as LoanActionResult | undefined;
  const navigation = useNavigation();
  const [member, setMember] = useLocalStorage('northside.member', '');

  const errors = result?.errors ?? {};
  const submitting = navigation.state === 'submitting';
  const days = result?.loan.days ?? 14;

  return (
    <section>
      <h1>New loan</h1>

      <Form method="post" noValidate>
        <p className="field">
          <label htmlFor="member">Member</label>
          <input
            id="member"
            name="member"
            defaultValue={member}
            onChange={(event) => setMember(event.target.value)}
            aria-invalid={errors.member !== undefined}
            aria-describedby={errors.member === undefined ? undefined : 'member-error'}
          />
          {errors.member !== undefined && (
            <span className="error" id="member-error" role="alert">
              {errors.member}
            </span>
          )}
        </p>
        {/* the book select and the days input follow the same shape */}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Recording' : 'Record loan'}
        </button>
      </Form>
    </section>
  );
}
```

The pieces that make it a form rather than a collection of inputs:

- A `<label htmlFor>` for every field, tied to the `id`. The label is the field's name for a screen reader and
  a click target for everybody else.
- `aria-invalid` on the field and `aria-describedby` pointing at the message, so the two are read together.
- `role="alert"` on the message, which announces it when it appears rather than waiting for the reader to walk
  over the field again.
- `name` on every control, because that is what `new FormData(form)` reads.
- `disabled` on the submit button while the request is in flight, which stops the double submission a person
  makes when nothing appears to happen.
- `noValidate` on the form. That attribute turns off the browser's own bubbles so the messages you render are
  the ones people see, and one set of messages is easier to keep consistent than two.

## Where the rules live

```ts
function validate(loan: Loan): LoanErrors {
  const errors: {
    member?: string;
    bookId?: string;
    days?: string;
  } = {};

  if (loan.member.length < 3) {
    errors.member = 'A member name needs at least three characters.';
  }

  if (loan.bookId.length === 0) {
    errors.bookId = 'Choose a book.';
  }

  if (!Number.isInteger(loan.days) || loan.days < 1 || loan.days > 28) {
    errors.days = 'A loan runs for between 1 and 28 days.';
  }

  return errors;
}
```

That function is in `routes.tsx` and the route's action calls it. There is no second copy of the rules in the
component, and the component renders whatever the action returned.

In a real application the same thing is true one level up: the API validates the body again, because a client
can be edited, and the client validates for a fast answer. Two implementations of one rule are a maintenance
cost, and the trade is worth it. Anything the client cannot know, such as whether a copy is already on loan,
only the server can answer.

## Showing the message under the right field

```tsx
{errors.member !== undefined && (
  <span className="error" id="member-error" role="alert">
    {errors.member}
  </span>
)}
```

`errors.member` is `string | undefined`, and React renders `undefined` as nothing, so the condition could be
left off. I keep it for two reasons: it is obvious that the element is conditional, and the `id` and
`aria-describedby` pair is easier to check when the message has its own block.

A message that appears after the first keystroke of a field somebody is still filling in is worse than no
message. The form of a loan uses one submit for everything, so messages appear together after a submit. A
form that validates while typing needs the touched state from the previous page, and a rule about which
messages wait for blur.

## The dataset the fields are generated from

```tsx
<select id="bookId" name="bookId" defaultValue={result?.loan.bookId ?? ''}>
  <option value="">Choose a book</option>
  {books.map((book) => (
    <option key={book.id} value={book.id}>
      {book.title} ({genreLabel(book.genre)})
    </option>
  ))}
</select>
```

The options come from the route's loader, so the select is populated before the page appears. The value is
`book.id` and the label is for reading, which is the pattern for any select built from data. `defaultValue`
takes the value from the failed submission, so the choice a person made survives the round trip.

## Client-side validation without a router

```tsx
const [errors, setErrors] = useState<{ member?: string }>({});

function onSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const member = String(data.get('member') ?? '').trim();

  if (member.length < 3) {
    setErrors({ member: 'A member name needs at least three characters.' });
    return;
  }

  setErrors({});
  submit({ member });
}
```

The same shape, with state instead of a route result. It is the right answer for a form with nowhere to go,
which is what a dialog with a single field usually is. The next two pages replace the state with an action,
which moves the work out of the component and makes the failing case testable on its own.

## Check yourself

Add a `Copies` field to the loan form that must be between one and nine, validate it in the action, and wire
the message with `aria-describedby`. Then submit the form with the keyboard only and check that every message
is reachable without a mouse.
