---
title: Objects and structural typing
summary: Shapes rather than names, the excess property check that only applies to literals, and readonly.
chapter: Types and narrowing
minutes: 14
status: draft
---

## An object type is a shape

```ts
type Row = {
  key: string;
  value: number;
  level?: 'quiet' | 'loud';
  readonly id: number;
};

const row: Row = { key: 'a', value: 1, id: 1 };
```

`?` makes a property optional, so it can be absent or, unless `exactOptionalPropertyTypes` is on, explicitly
`undefined`. `readonly` stops an assignment through this type, which is a promise about the type rather than about the
object: a second alias without `readonly` can still change it.

## Structure decides assignability, not the name

```ts
type Point = { x: number; y: number };

function draw(point: Point): string {
  return `${point.x},${point.y}`;
}

const variable = { x: 1, y: 2, z: 3 };

draw(variable);
```

That compiles, and there is no `Point` anywhere in the value's declared type. A type in TypeScript says which
properties must be present and of which type; it says nothing about where the value came from or what it was called.
That is structural typing, and it is the rule that makes a third party class usable as your interface with no adapter.

The consequence worth knowing is the opposite direction: a value with the right fields is accepted even when it has
extra ones, so a function cannot assume it received only what it declared.

## Except for a fresh literal

```ts
draw({ x: 1, y: 2, z: 3 });
```

```text
error TS2353: Object literal may only specify known properties, and 'z' does not exist in type 'Point'.
```

The same object is rejected when it is written inline and accepted through a variable. The difference is that the
compiler can see the literal was written for that call, so an unknown property is almost certainly a typo rather than
something intended. The name for it is the excess property check, and it applies to object literals and to values
returned from a function with a declared return type.

```ts
const literal: Point = { x: 1, y: 2, z: 3 };      // error
const fromVariable: Point = variable;               // fine
```

That pair is the most confusing thing about structural typing, and once it is understood the rest follows.

## A weak type needs one property in common

```ts
type Options = {
  verbose?: boolean;
  retries?: number;
};

const other = { timeout: 1000 };
const wrong: Options = other;
```

```text
error TS2559: Type '{ timeout: number; }' has no properties in common with type 'Options'.
```

A type where every property is optional is called weak, and the compiler requires at least one property in common. It
catches the caller who passes an object of broadly the right kind that has nothing to do with the type, which would
otherwise be accepted because every property is optional.

Passed as a literal, the same argument produces the excess property error instead, which is the check from the previous
section doing the work first:

```text
error TS2353: Object literal may only specify known properties, and 'timeout' does not exist in type 'Options'.
```

## Index signatures and Record

```ts
type Counts = {
  [key: string]: number;
};

const counts: Counts = {};
counts['a'] = 1;
```

An index signature says every key maps to a value of that type. `Record<string, number>` is the same thing written with
a utility type, and it is the shorter of the two.

The direction to remember is that an index signature makes every key valid, so a typo becomes a new key rather than an
error. The fixed version is a `Record` over a union of literals:

```ts
type Totals = Record<'key' | 'value', string>;
```

There every key is required and no other key is allowed, which is the version that catches a mistake.

## Method syntax and property syntax are different

```ts
type WithMethod = {
  save(row: Row): void;
};

type WithProperty = {
  save: (row: Row) => void;
};
```

They look equivalent and they behave differently under `strictFunctionTypes`. Method syntax is checked bivariantly, so
it accepts a parameter type that is a supertype or a subtype; property syntax is checked contravariantly, which
requires the parameter type to match or be wider. The short version: use property syntax for a function type you own,
and method syntax for a member you implement.

That difference has its own lesson in the generics chapter, because it is the same rule that decides whether your
callbacks accept the types you expect.

## exactOptionalPropertyTypes

```ts
type Options = { retries?: number };

const options: Options = { retries: undefined };
```

```text
error TS2375: Type '{ retries: undefined; }' is not assignable to type 'Options'
with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types
of the target's properties.
```

With that flag on, an optional property cannot be given `undefined` explicitly, which separates a property that is
absent from one present with no value. That distinction matters for anything that treats them differently: a JSON body,
a patch operation, an update that only touches the fields it was sent. The flag is off by default because turning it on
is a large change to an existing codebase.

## readonly is shallow

```ts
type Config = {
  readonly mode: string;
  readonly tags: string[];
};

const config: Config = { mode: 'strict', tags: [] };

config.mode = 'loose';
config.tags.push('new');
```

```text
error TS2540: Cannot assign to 'mode' because it is a read-only property.
```

The assignment is rejected and the `push` is not, because `readonly` applies to the property rather than to the value it
points at. A read-only array is written `readonly string[]`, and that is the modifier to use when the contents must not
change:

```text
error TS2339: Property 'push' does not exist on type 'readonly string[]'.
```

A `readonly string[]` is also not assignable to a `string[]`, which is the rule that stops a function taking a mutable
array from holding on to a frozen one. It propagates: a function that only reads its array argument should declare
`readonly string[]` so that callers with a frozen array can use it.

## Check yourself

Write a function taking an object type and call it three ways: with an inline literal, with a variable, and with a
literal that has an extra property. Explain which two are accepted. Then make a property readonly and an array
readonly, and try to change both.
