---
title: Signal forms
summary: The model is a signal, the schema holds the rules, and the template binds fields to controls.
chapter: Forms
minutes: 16
status: draft
---

## The model

```ts
import { Injectable, computed, signal } from '@angular/core';
import type { Loan } from './book';

const EMPTY: Loan = { bookId: '', member: '', days: 14 };

/** The loan being filled in, kept outside the component so a guard can read it. */
@Injectable({ providedIn: 'root' })
export class LoanDraft {
  /** The model the form writes into. */
  readonly model = signal<Loan>(EMPTY);

  private readonly saved = signal(false);

  readonly hasUnsavedChanges = computed(
    () => !this.saved() && JSON.stringify(this.model()) !== JSON.stringify(EMPTY),
  );

  reset(): void {
    this.model.set(EMPTY);
    this.saved.set(false);
  }

  markSaved(): void {
    this.saved.set(true);
  }
}
```

A signal form wraps a writable signal and writes straight into it. There is no second copy of the data
inside the form, so `model()` is always the current value, and a `canDeactivate` guard can read the
draft from the injector without asking the component anything.

## The form and its schema

```ts
import { FormField, form, max, min, minLength, required, submit } from '@angular/forms/signals';

protected readonly loan = form(this.draft.model, (path) => {
  required(path.member, { message: 'Enter the member name.' });
  minLength(path.member, 3, { message: 'A member name needs at least three characters.' });
  required(path.bookId, { message: 'Choose a book.' });
  min(path.days, 1, { message: 'A loan runs for at least one day.' });
  max(path.days, 28, { message: 'A loan runs for at most 28 days.' });
});
```

`form(model, schema)` returns a field tree shaped like the model: `loan.member`, `loan.bookId` and
`loan.days` are fields, and `loan()` is the root field. The second argument is a function that binds
logic to paths, and it runs once to set up the rules rather than on every keystroke.

The path is typed, which is the part that earns its keep. `path.member` exists because `Loan` has a
`member`, and a validator applied to a field that does not exist is a compile error.

## Binding a control

```html
<form (submit)="save($event)" novalidate>
  <label for="member">Member</label>
  <input id="member" [formField]="loan.member" />
  @if (loan.member().touched() && loan.member().errors().length > 0) {
    <p role="alert">{{ loan.member().errors()[0].message }}</p>
  }

  <label for="book">Book</label>
  <select id="book" [formField]="loan.bookId">
    <option value="">Choose a book</option>
    @for (book of books(); track book.id) {
      <option [value]="book.id">{{ book.title }} ({{ book.genre | genreLabel }})</option>
    }
  </select>

  <label for="days">Days</label>
  <input id="days" type="number" [formField]="loan.days" />

  <button type="submit" [disabled]="loan().submitting()">
    {{ loan().submitting() ? 'Recording' : 'Record loan' }}
  </button>
</form>
```

`[formField]` is the directive that binds a field to a control, and it does four jobs: it reads the
value into the control, writes the control's value back, applies the field's disabled and required
state, and marks the field touched on blur. It works with a native input, a select and a textarea, and
with a component that implements the signal forms control contract.

Two things the compiler enforces, both learned by trying it:

- The directive is `[formField]`, and a `name` attribute on the same element is an error:
  `NG8022: Setting the 'name' attribute is not allowed on nodes using the '[formField]' directive`. The
  directive generates its own, which is how it stays out of the way of a template-driven form on the
  same page.
- A binding to a member that does not exist on the model fails the build, because the field tree's type
  comes from the model.

## Reading field state

```ts
loan.member().value()      // the current value
loan.member().touched()    // has the control been blurred, or the form submitted
loan.member().dirty()      // has the value changed
loan.member().valid()      // no errors and nothing pending
loan.member().invalid()    // errors, whether or not a validator is still running
loan.member().errors()     // the validation errors, each with a kind and a message
loan().errorSummary()      // the errors of every field below this one
loan().submitting()        // is a submission in flight
```

`valid()` and `!invalid()` are not the same thing, and the difference is the async validators. A field
with a validator still running is not valid, and it is not invalid either, because no error has been
produced. Disabling a submit button with `loan().invalid()` allows a submit while a check is pending,
which is why the button above reads `loan().submitting()` instead.

## Submitting

```ts
protected async save(event: Event): Promise<void> {
  event.preventDefault();
  this.failure.set('');

  await submit(this.loan, async (field) => {
    const loan: Loan = field().value();
    try {
      const receipt = await this.catalog.borrow(loan);
      this.receipt.set(receipt);
      this.draft.markSaved();
    } catch {
      this.failure.set('The loan could not be recorded.');
      return [{ kind: 'network', message: 'The loan could not be recorded.' }];
    }
    return undefined;
  });
}
```

`submit(form, action)` validates first, marks the fields touched so the messages appear, runs the
action, and returns whether it succeeded. It also refuses to start a second submission while one is in
flight, which is the behaviour a double click needs.

The action's return value is the interesting part. `undefined` means success. An array of errors means
the server rejected something, and each error carries the field it belongs to so the message lands
under the right control:

```ts
return [
  {
    fieldTree: registrationForm.username,
    kind: 'server',
    message: 'Username already taken',
  },
];
```

An error with no `fieldTree` belongs to the form, which is where a network failure or a whole-request
rejection goes.

## Testing it

```ts
it('blocks a submission the schema rejects', async () => {
  const fixture = TestBed.createComponent(LoanForm);
  await TestBed.inject(ApplicationRef).whenStable();

  submitButton(fixture).click();
  await TestBed.inject(ApplicationRef).whenStable();

  expect(catalog.borrow).not.toHaveBeenCalled();
  expect(fixture.nativeElement.textContent).toContain('Enter the member name.');
});
```

```ts
it('posts the loan once the fields are filled in', async () => {
  typeInto(fixture, '#member', 'Ada Lovelace');
  typeInto(fixture, '#days', '21');
  pickOption(fixture, '#book', 'dune');
  await TestBed.inject(ApplicationRef).whenStable();

  submitButton(fixture).click();
  await TestBed.inject(ApplicationRef).whenStable();

  expect(catalog.borrow).toHaveBeenCalledWith({
    member: 'Ada Lovelace',
    days: 21,
    bookId: 'dune',
  });
});
```

Both tests drive the form through the DOM, which is the level the behaviour lives at: type, select,
click, then assert what the component asked for. The number input is worth a second look. The control's
value is the string `'21'` and the model's `days` is the number `21`, because the directive parses a
number input. A value the input cannot parse leaves the model untouched and reports a parse error on
the field.

## Check yourself

Add a `notes` field to the model, bind it to a textarea, and cap it with a `maxLength` validator with
its own message. Then log `loan().value()` from a button and watch it change as you type, and delete
the model field while leaving the binding in place to read the compiler error.
