---
title: Validation and schemas
summary: Built-in validators, your own rules over one field or several, and the shape a server error takes.
chapter: Forms
minutes: 14
status: draft
---

## The built-in validators

A schema binds rules to paths. The set that arrives with the API covers the cases that would otherwise
be written by hand:

| Validator | Applies to |
| --- | --- |
| `required(path)` | anything, with an option for an empty string |
| `min`, `max` | numbers |
| `minLength`, `maxLength` | strings and collections |
| `pattern(path, regex)` | strings |
| `email(path)` | strings |
| `minDate`, `maxDate` | dates |
| `validate`, `validateTree` | your own rule, for one field or a subtree |
| `validateAsync`, `validateHttp` | a rule that has to ask something |
| `requiredError`, `minError`, `patternError`, and the rest | custom error shapes |

Every one of them takes a config object with a `message`:

```ts
required(path.member, { message: 'Enter the member name.' });
minLength(path.member, 3, { message: 'A member name needs at least three characters.' });
pattern(path.member, /^[A-Za-z ]+$/, { message: 'Letters and spaces only.' });
min(path.days, 1, { message: 'A loan runs for at least one day.' });
max(path.days, 28, { message: 'A loan runs for at most 28 days.' });
```

The `message` can be a function of the field's context, which is how a message reads a limit out of the
value it rejected rather than repeating the number in a string. The alternative to `message` is
`error`: an error shape or a function returning one, for a message that is looked up by kind in a
translation file.

## A rule of your own

```ts
validate(path.member, ({ value }) =>
  value().trim().includes('  ') ? { kind: 'double-space', message: 'One space between names.' } : undefined,
);
```

The function receives the field's context and returns either `undefined` or one error, or an array of
errors. It runs reactively, so anything it reads from the context is tracked and the rule re-evaluates
when that changes.

For a rule about more than one field, the path is the parent and the check reads the children:

```ts
validateTree(path, ({ value }) => {
  const loan = value();
  return loan.bookId.length > 0 && loan.member.length === 0
    ? { kind: 'member-required', message: 'A loan needs a member.' }
    : undefined;
});
```

`validateTree` runs over a subtree and reports at the level you pass in, which is where a
"these two fields disagree" message belongs. `errorSummary()` on the root field collects everything
below it, which is what a summary panel at the top of a long form renders.

## Conditional rules and conditional fields

```ts
applyWhen(path.days, ({ value }) => value() > 14, (days) => {
  max(days, 60, { message: 'At most 60 days with a reason.' });
});

disabled(path.member, { when: ({ value }) => value().startsWith('staff:') });
readonly(path.days, { when: ({ value }) => value() > 21 });
hidden(path.notes, { when: () => !this.allowNotes() });
```

A condition is a function of the field's context, so `value()` inside it is the signal, and the schema
you pass applies to the same path. `applyWhen` and `applyWhenValue` turn rules on and off, which is how
a schema stays readable instead of becoming a chain of conditions inside one validator. When the rule is
about a *different* field, the path to hang it on is the parent, which is what `validateTree` is for.

`disabled`, `readonly` and `hidden` each take a `when` and change the field's availability rather than
its value:

- a disabled field does not contribute to the value, the validation or the touched state of its parent,
- a readonly field shows its value and refuses writes,
- a hidden field is not rendered.

The deprecated form of those three takes the function or string directly. The `{ when: ... }` object is
the current one, and a codebase on the old shape compiles with a deprecation warning.

## Waiting before validating

```ts
debounce(path.member, 300);
debounce(path.member, 'blur');
```

A rule that runs on every keystroke is fine locally and wrong when it asks the server. `debounce` holds
the validation for a delay or until the field is blurred, which pairs with `validateHttp`:

```ts
validateHttp(path.member, {
  request: ({ value }) => (value().length > 2 ? `/api/members/${value()}` : undefined),
  onSuccess: (response) => (response.exists ? undefined : { kind: 'unknown-member', message: 'No such member.' }),
});
```

The return value of `request` is the URL, and returning `undefined` skips the check, which is how a
short value avoids a pointless request. `validateAsync` is the same idea with your own promise.

## A reusable schema

```ts
export const memberName = schema<string>((path) => {
  required(path, { message: 'Enter the member name.' });
  minLength(path, 3, { message: 'A member name needs at least three characters.' });
  pattern(path, /^[A-Za-z ]+$/, { message: 'Letters and spaces only.' });
});
```

```ts
readonly loan = form(this.draft.model, (path) => {
  memberName(path.member);
  required(path.bookId, { message: 'Choose a book.' });
});
```

`schema()` names a set of rules so it can be applied at more than one path. The rules about a member
name are the same on the loan form, the reservation form and the profile page, and this is where they
live once.

## Validating against a standard schema

```ts
import { validateStandardSchema } from '@angular/forms/signals';

validateStandardSchema(path, MemberSchema);
```

`validateStandardSchema` accepts anything implementing the Standard Schema interface, which Zod and
Valibot both do. It is the bridge for an API contract you already describe with a schema: the same
description validates the response body and the form, and the error messages come from one place.
`@angular/forms` carries the spec package and Zod as dependencies for this reason.

## Check yourself

Write a cross-field rule that rejects a loan of more than 14 days without a reason, and give it a
message that names the limit. Then move the member name rules into a `schema()` and apply it to two
forms, and finally debounce a rule and count how often it runs before and after.
