---
title: Narrowing and control flow
summary: How the compiler follows a check through the code, and the four cases where the narrowing does not survive.
chapter: Types and narrowing
minutes: 14
status: draft
---

## The checks that narrow

```ts
function size(value: string | string[] | null): number {
  if (value === null) {
    return 0;
  }

  if (typeof value === 'string') {
    return value.length;
  }

  return value.length;
}
```

The compiler tracks the type of `value` through the branches, so after the `return` in the first `if` the type no longer
includes `null`, and inside the second it is `string`. The narrowing is control-flow analysis rather than a variable
declaration, and it survives an early return, a `throw` and an `else`.

The checks that narrow a union:

| Check | Narrows |
| --- | --- |
| `typeof value === 'string'` | to `string`, and the other arms fall away |
| `value instanceof NotFound` | to the class |
| `'a' in value` | to the members that have `a` |
| `value.kind === 'started'` | to the member with that literal |
| `Array.isArray(value)` | to the array member |
| `value === null` | to `null` |
| `if (value)` | to the truthy members, which is rarely what you want |

## Truthiness narrows and surprises

```ts
function show(value: string | undefined): void {
  if (value) {
    console.log(value.length);
  }
}
```

That works and it also discards an empty string, which is a valid value. The narrower check is the one to write:

```ts
if (value !== undefined) {
  console.log(value.length);
}
```

`if (value)` is right when an empty string really is the same as no value, and wrong when the difference matters. The
same applies to `if (count)` with a count of zero.

## Narrowing survives an assignment

```ts
function load(input: string | undefined): string {
  if (input === undefined) {
    input = 'default';
  }

  return input.toUpperCase();
}
```

The assignment narrowed `input` to `string`, so the return needs no check. That is why a default written as an
assignment reads better than one written as a ternary with a check on both sides.

## Narrowing is lost when the binding can change

```ts
function log(value: string | undefined): void {
  if (value === undefined) {
    return;
  }

  const later = () => console.log(value.length);

  value = undefined;

  later();
}
```

```text
error TS18048: 'value' is possibly 'undefined'.
```

The callback runs later, so the compiler checks whether the narrowed value could have changed by then. Here it can,
because `value` is reassigned before the callback runs, and the error is on the read rather than on the call. Remove
the assignment and the same code compiles: TypeScript keeps a narrowing inside a callback when the binding it narrowed
cannot have changed.

That is more permissive than it used to be, and the rule to hold on to is that a narrowing is tied to a value that
cannot change. A `const` always qualifies. A `let` or a parameter qualifies until it is assigned again.

```ts
type Row = { value: string | undefined };

function pick(row: Row): number {
  if (row.value === undefined) {
    return 0;
  }

  row.value = undefined;

  return row.value.length;
}
```

```text
error TS18048: 'row.value' is possibly 'undefined'.
```

The assignment to the property widened it again, so the read needs a check. Narrowing a property is tied to that
property in that scope, which is why a check on `row.value` says nothing about `other.value` and why a call that might
have changed it is worth avoiding by copying the value into a local first:

```ts
const value = row.value;

if (value === undefined) {
  return 0;
}

return value.length;
```

A local `const` cannot change, so the narrowing holds for the rest of the scope, and the code does not depend on what
another function did.

## Write your own narrowing function

```ts
type Row = { key: string; value: number };

function isRow(value: unknown): value is Row {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Row).key === 'string' &&
    typeof (value as Row).value === 'number'
  );
}

function parse(input: unknown): Row {
  if (!isRow(input)) {
    throw new TypeError('not a row');
  }

  return input;
}
```

A function whose return type is `value is Row` turns its check into a narrowing for every caller, which is how a
validation helper is typed. The body is unchecked, so a predicate that lies is a bug the compiler will believe; that is
why these functions usually stay small and are tested directly.

```ts
function assertRow(value: unknown): asserts value is Row {
  if (!isRow(value)) {
    throw new TypeError('not a row');
  }
}
```

An `asserts` return type is the same idea for a function that throws, and it narrows the value for the rest of the
scope without an `if`. It is convenient and it hides the control flow, so it is worth using where the check is a
precondition rather than a branch.

## Narrowing an optional property with in

```ts
type A = { a: number };
type B = { b: number };

function pick(value: A | B): number {
  if ('a' in value) {
    return value.a;
  }

  return value.b;
}
```

`in` narrows to the members that have the property, which works for a union of objects without a discriminant. It is
less reliable than a discriminant when a property is optional: `'a' in value` is true for a member with `a?: number`,
so the narrowing lands on a type where `value.a` may still be undefined.

## Check yourself

Write a function that narrows a `string | string[] | undefined` with an early return and a `typeof` check. Then use the
same value inside a `setTimeout` and read the error, and fix it by capturing the value in a `const`. Finally write an
`isRow` type predicate and use it on an `unknown` input.
