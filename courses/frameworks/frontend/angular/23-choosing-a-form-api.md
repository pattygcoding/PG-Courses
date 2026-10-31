---
title: Choosing a form API
summary: Angular ships three ways to handle input, and v22 adds a fourth shape that the others are measured against.
chapter: Forms
minutes: 12
status: draft
---

## Three APIs, one state model

| | Signal forms | Reactive forms | Template driven |
| --- | --- | --- | --- |
| Truth lives in | a writable signal you own | a `FormGroup` tree | the template directives |
| Validation | functions in a schema | functions on controls | attributes and directives |
| Dynamic rows | a field tree over an array | `FormArray` | awkward |
| Typed by | the model's type | the control declarations | nothing |
| Reach for it | new work | existing code, `FormArray`, custom controls | one field, one form |

Signal forms arrived as a stable API in v22, and it is the one this course builds with. Reactive forms
and template-driven forms are both fully supported and both still appear in code written before this
release, so a page each is worth reading even if you never start a new form with them.

The reason signal forms fit the rest of this course is that the form is a signal. A field's value is a
writable signal, its validity is a signal, and a template reads them the same way it reads anything
else. There is no separate change detection story for forms:

```ts
readonly loan = form(this.draft.model, (path) => {
  required(path.member, { message: 'Enter the member name.' });
  minLength(path.member, 3, { message: 'A member name needs at least three characters.' });
});

// loan.member() is a field, loan.member().value is a writable signal,
// loan.member().errors() is a signal of validation errors.
```

## The zoneless warning about reactive forms

One behaviour difference is worth knowing before you choose, and the framework's own documentation
calls it out. In a zoneless application, reactive form updates through `setValue`, `patchValue` and
`FormArray.push` change the form's state and emit its observables, and they do not schedule a change
detection run. A template that reads `form.value` directly can therefore show a stale value.

Two fixes are possible, and one of them is a signal:

```ts
readonly value = toSignal(this.reservation.valueChanges, { initialValue: this.reservation.value });
```

```ts
this.reservation.patchValue({ holder: 'Ada' });
this.changeDetector.markForCheck();
```

Events that come from the DOM, such as typing into a bound input, notify change detection as usual.
It is the programmatic update that needs the nudge, and it is the reason a form driven by an API
response is a good candidate for signal forms instead.

## Template-driven forms, briefly

```html
<form #loanForm="ngForm" (ngSubmit)="save(loanForm.value)">
  <label for="member">Member</label>
  <input id="member" name="member" [(ngModel)]="member" required minlength="3" />
  <button type="submit" [disabled]="loanForm.invalid">Record</button>
</form>
```

`FormsModule` provides `ngModel`, and `#loanForm="ngForm"` exposes the implicit form model the
directives built from the template. It is the shortest way to get one small form working, and it stops
being short as soon as validation has to be shared, tested or generated. The `name` attribute is
required on every control, which is exactly the attribute signal forms refuses (its `formField`
directive generates one).

## What the choice costs

A form API decision is hard to reverse once a form has ten fields, so the questions I ask are:

- does the model have a TypeScript type I want enforced? signal forms, because the form is typed by the
  model and a field that does not exist is a compile error,
- does the form have rows that come and go? reactive forms and their `FormArray` are the most
  documented answer, and signal forms model arrays too,
- is there a third-party control component? it probably implements `ControlValueAccessor`, which
  reactive forms consume directly and signal forms consume for compatibility,
- is the form one field in a footer? template-driven, and nobody will mind.

## Check yourself

Write the same three-field form twice, once with signal forms and once with reactive forms, and time
how long each takes to validate, submit and test. Then add a row that can be repeated and see which of
the two needed less code.
