---
title: Forms and validation
summary: Messages next to fields, the attributes that tie them together, and the same rules checked twice.
chapter: Forms and app state
minutes: 14
status: draft
---

## The rules in one function

```ts
interface FieldErrors {
  member?: string
  bookId?: string
  days?: string
}

function validate(loan: Loan): FieldErrors {
  const found: FieldErrors = {}

  if (loan.member.length < 3) {
    found.member = 'A member name needs at least three characters.'
  }

  if (loan.bookId === '') {
    found.bookId = 'Choose a book.'
  }

  if (!Number.isInteger(loan.days) || loan.days < 1 || loan.days > 28) {
    found.days = 'A loan runs for between 1 and 28 days.'
  }

  return found
}
```

One pure function, one shape of result, and the component renders whatever it returns. A validator that reads state
and writes state is harder to test and easier to get wrong; this one takes a plain object and returns a plain
object, so a test is three lines with no mounting involved.

## The submit handler

```ts
async function submit(): Promise<void> {
  const loan: Loan = {
    member: member.value.trim(),
    bookId: bookId.value,
    days: Number(days.value),
  }

  errors.value = validate(loan)

  if (Object.keys(errors.value).length > 0) {
    return
  }

  const receipt = await loans.borrow(loan)

  if (receipt !== null) {
    await router.push({
      name: 'thanks',
      query: { member: loan.member, dueOn: receipt.dueOn },
    })
  }
}
```

Four steps in order: build the value from the fields, validate it, stop if the validation failed, and navigate only
after the request came back with a receipt. The `errors.value = validate(loan)` assignment replaces the whole
object, which is what makes the previous run's messages disappear when the next one is clean.

## The attributes that make a message a message

```vue
<AppField v-model="member" label="Member" name="member" :error="errors.member" />

<AppField label="Book" name="bookId" :error="errors.bookId">
  <template #default="{ id, invalid, describedBy }">
    <select :id="id" v-model="bookId" name="bookId" :aria-invalid="invalid" :aria-describedby="describedBy">
      <option value="">Choose a book</option>
      <option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }}</option>
    </select>
  </template>
</AppField>
```

`AppField` renders a `<label>` bound to the control's id, the control itself, and the message:

```vue
<span v-if="error" :id="errorId" class="error" role="alert">{{ error }}</span>
```

Three things have to line up for a screen reader to read a message as the message for a field, and `AppField` is
where they line up once:

- `aria-invalid="true"` on the control, so the field is announced as invalid.
- `aria-describedby` pointing at the message's id, so the two are read together.
- `role="alert"` on the message, so it is announced when it appears rather than waiting for the reader to walk back
  over the field.

I checked all three in the browser after submitting an empty form:

```text
alerts: ["A member name needs at least three characters.", "Choose a book."]
memberInvalid: "true"
memberDescribedBy: "field-member-error"
url: http://localhost:4290/loans/new
```

The URL is unchanged, which is the point of validating before the request: a failed validation is not a navigation.

## Waiting, and disabling

```vue
<button type="submit" :disabled="!canSubmit || loading">
  {{ loans.saving ? 'Recording' : 'Record loan' }}
</button>
```

```ts
const canSubmit = computed(() => !loans.saving && books.value.length > 0)
```

`loans.saving` comes from the store: it is true from the moment the request starts until it settles. Disabling the
button is what stops the second submission somebody makes when nothing appears to happen, and the label changing to
"Recording" is what tells them the first one is in flight.

## The failure the server produced

```ts
async function borrow(loan: Loan): Promise<LoanReceipt | null> {
  saving.value = true
  error.value = null

  try {
    const receipt = await requestLoan(loan)
    receipts.value = [...receipts.value, receipt]
    return receipt
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The loan could not be recorded.'
    return null
  } finally {
    saving.value = false
  }
}
```

```vue
<p v-if="loans.error" role="alert">{{ loans.error }}</p>
```

The store turns a failed request into a message rather than a throw, and the handler decides what to do with a `null`
receipt: it stays on the form. Note the `finally`, which is what re-enables the button after a failure. Without it,
the first failure leaves the button disabled, and that is a bug which shows up only when the network misbehaves.

## Validating while typing, or on submit

This form validates on submit, so the messages appear together and a field somebody is still filling in is not
accused of anything. The alternative needs one more piece of state:

```ts
const touched = ref<Record<string, boolean>>({})

function markTouched(field: string): void {
  touched.value = { ...touched.value, [field]: true }
}

const shown = computed(() => (touched.value['member'] === true ? errors.value.member : undefined))
```

A message that appears after the first keystroke of a valid name is worse than no message, so a form that validates
while typing waits for a blur. Which of the two to build depends on the form: three fields submitted once is fine on
submit, and a long form where the last field is expensive to reach wants the earlier feedback.

## The rules run twice

The `validate` function above runs in the browser, and a server that accepts the loan has to repeat it. Three
reasons, and each one is enough on its own:

- The browser is not the only client. A `curl` request posts the same body and no client-side rule stops it.
- The rules that need the database live there: how many copies are on the shelf, whether this member already has the
  book, whether the account is suspended.
- An error the client could not predict has to come back as data rather than as a 500, and the form has to have a
  place to show it.

The duplication is real, and the alternative is a server error nobody can act on. What I keep out of the client is
anything that would leak a rule the server should own: a limit that exists for a business reason belongs on the
server, and the client's copy of it is a courtesy.

## Check yourself

Add a `copies` field that must be between one and nine, validate it in the same function, and wire its message
through `AppField`. Then submit the form with the keyboard only and confirm that every message is reachable and
announced.
