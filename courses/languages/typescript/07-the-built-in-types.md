---
title: The built-in types
summary: The primitives, the three type-level types, and why {} is not what it looks like.
chapter: Types and narrowing
minutes: 13
status: draft
---

## The primitives

```ts
const text: string = 'a';
const count: number = 1;
const flag: boolean = true;
const big: bigint = 1n;
const id: symbol = Symbol('id');
```

Those are the same five primitives JavaScript has, spelled as types. `Number` and `String` written with a capital are
the wrapper object types, which are almost never what you want:

```ts
const boxed: Number = 1;      // an object type, avoid
const raw: number = 1;         // the primitive
```

`null` and `undefined` are their own types, and the two are separate under `strictNullChecks`. That is the subject of a
later lesson in this chapter.

## A literal type is a single value

```ts
const mode: 'strict' = 'strict';
const die: 6 = 6;
const yes: true = true;
```

A literal type accepts exactly one value, which is what makes a union of literals useful as an enum:

```ts
type Level = 'quiet' | 'normal' | 'loud';

function setLevel(level: Level) { }
```

`setLevel('loud')` compiles and `setLevel('shout')` does not, which is a check that a string type cannot give you.
Literal types are the reason a union of strings is usually better than an enum, and that comparison has its own lesson.

## any and unknown

```ts
function fromAny(input: any) {
  return input.rows.map((row: any) => row.key);
}

function fromUnknown(input: unknown) {
  return input.rows.map((row: unknown) => row.key);
}
```

`any` switches the checker off: every property read, every call and every assignment on it is accepted, and the result
of an operation on an `any` is another `any`, so it spreads through the function that received it.

`unknown` accepts any value as an argument and allows nothing to be done with it until it is narrowed:

```text
error TS18046: 'input' is of type 'unknown'.
```

The rule I use: `unknown` at every boundary where a value arrives from outside, and `any` only where a third party type
is wrong and the alternative is a cast that lies harder.

## never is the empty type

```ts
function fail(message: string): never {
  throw new Error(message);
}
```

A `never` return type says the function does not return at all, which the compiler uses in two ways. A function that
throws satisfies it, so a caller knows the code after it is unreachable. And a union that has been narrowed away to
nothing becomes `never`, which is how an exhaustive check is written:

```ts
type Level = 'quiet' | 'loud';

function volume(level: Level): number {
  if (level === 'quiet') {
    return 0;
  }

  if (level === 'loud') {
    return 10;
  }

  const unreachable: never = level;
  return unreachable;
}
```

The last two lines are the pattern: if a new member is added to `Level`, `level` is no longer assignable to `never` and
the compiler reports the line. That is a compile-time exhaustiveness check, and it is worth having wherever a union
represents a closed set. A later lesson builds the same thing with a switch.

An empty array is `never[]`, which is the same type seen from the other side.

## void is for a function that returns nothing

```ts
function save(row: Row): void {
  store.set(row.key, row);
}
```

`void` means the caller should not use the return value. It is not the same as `undefined` in a callback position, and
the difference is deliberate:

```ts
type Handler = () => void;

const log: Handler = () => 42;
```

That assignment is accepted, because a function returning a value is allowed where the contract says the value is
ignored. It is the rule that lets `array.forEach((row) => rows.push(row.id))` compile, where `push` returns a number.

## object, Object and {}

```ts
type A = object;
type B = Object;
type C = {};
```

Those three are different and the last one is the trap. `object` means any non-primitive. `Object` means anything with
the methods of `Object.prototype`, which includes strings and numbers. `{}` means any value that is not null or
undefined, so it accepts a number:

```ts
const empty: {} = 1;
```

```text
(no error)
```

Writing `{}` as a type is almost never what is meant. Write the shape you want, or `Record<string, unknown>` for a
dictionary, or `object` for genuinely any non-primitive.

## undefined and null as types

```ts
let maybe: string | undefined;

console.log(maybe.length);
```

```text
error TS18048: 'maybe' is possibly 'undefined'.
```

Under `strictNullChecks`, a value that may be missing has to say so and the compiler requires a check before use. That
is the single most valuable thing the strict family does, and it is why the two types are worth knowing as types rather
than as values.

## Check yourself

Write a `never`-returning function and an exhaustive check with a `never` binding, then add a member to the union and
read the error. Then try assigning a number to `{}`, to `object` and to `unknown`, and record which ones are accepted.
