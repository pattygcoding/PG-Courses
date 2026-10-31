---
title: Functions and their types
summary: Where to annotate, what the compiler infers, and the two rules about arguments that surprise people.
chapter: Functions and collections
minutes: 13
status: draft
---

## Annotate the parameters, infer the return

```ts
export function total(rows: { value: number }[]): number {
  return rows.reduce((sum, row) => sum + row.value, 0);
}
```

The parameters need types, because nothing in the body can tell the compiler what a caller will pass. The return type is
inferable, and it is worth writing on an exported function anyway for the reason the inference lesson gave: the compiler
checks the body against the promise, so a change inside that alters the return type fails where the change was made
rather than at a caller.

```ts
function label(value: string) {
  return value.trim();
}
```

Hovering `label` shows `(value: string) => string`. Nothing was annotated on the return and the inference is exact, so
for a private helper the inference is enough.

## A function type is written with an arrow

```ts
type RowMapper = (row: Row) => RowResponse;

const parse: (text: string) => string[] = (text) => text.split(',');

function apply(rows: Row[], map: RowMapper): RowResponse[] {
  return rows.map(map);
}
```

The return type comes after `=>`, and a parameter name in the type is documentation rather than a requirement. That is
why the same shape can be written with any parameter names at all, and why two function types with the same signature
are the same type.

## Contextual typing fills in the parameters

```ts
rows.map((row) => row.value);
```

The parameter `row` has no annotation and the compiler knows it is a `Row`, because `map` on a `Row[]` expects a
function taking one. That is contextual typing, and it is why a callback in a pipeline needs no annotations and why
hovering an arrow in one shows the types the compiler was handed.

## Passing a function with fewer parameters is allowed

```ts
const log: (row: Row, index: number) => void = (row) => console.log(row.key);
```

A function with fewer parameters is assignable where more are expected, because it can ignore the extra
arguments. That is what makes `rows.forEach((row) => ...)` work when `forEach` passes three arguments, and it is the
reason a callback that takes one parameter can be handed to something that calls it with five.

It is also the reason a mistake here is silent: a callback with the wrong parameter in a different position still has
the right arity and the right type if the types happen to match.

```ts
rows.map(parseInt);
```

That compiles only because the parameters line up badly: `parseInt` takes a string and a radix, so the index arrives as
the radix. The JavaScript course covers the runtime result; the type system cannot help, because both signatures are
`(value, index) => number` as far as it is concerned.

## Extra arguments are rejected

```ts
function size(row: Row): number {
  return row.value;
}

size(row, 'extra');
```

```text
error TS2554: Expected 1 arguments, but got 2.
```

That is stricter than JavaScript, which ignores an argument a function does not declare. The check catches a call site
that was left behind when a parameter was removed, which is a real bug in a language where the extra argument silently
did nothing.

## The this parameter

```ts
function describe(this: Row, prefix: string): string {
  return `${prefix}${this.key}`;
}

describe.call(row, '>');
```

A `this` parameter is not a real parameter: it declares what `this` is inside the body, so the compiler can check the
`.call` and reject a detached use. It is the type-level answer to one of the language's least pleasant corners, and it
appears mostly in a library that has to support a method used as a callback.

```ts
const detached = row.describe;

detached('>');
```

```text
error TS2684: The 'this' context of type 'void' is not assignable to method's 'this' of type 'Row'.
```

## A void callback accepts a value-returning function

```ts
const record: (row: Row) => void = (row) => row.value;
```

That is accepted, because a return type of `void` says the caller ignores the value rather than that there is none. The
rule is what makes `array.push` usable in a callback, and it is why a `void` position is more permissive than a
`undefined` one.

## Generic functions need their own lesson

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}
```

`<T>` declares a type parameter and the compiler infers it from the argument, so `first([1, 2])` is `number | undefined`
with nothing written at the call site. That is the whole idea, and the generics chapter is where it gets its proper
treatment.

## Check yourself

Write a function with annotated parameters and an inferred return, hover it and read the signature. Then pass it a
callback with fewer parameters and one with too many arguments, and record which is rejected. Finally write a function
with a `this` parameter and call it detached.
