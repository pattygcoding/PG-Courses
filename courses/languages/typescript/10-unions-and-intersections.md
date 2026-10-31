---
title: Unions and intersections
summary: Either and both, the members a union exposes, and the impossible type that comes out of a bad intersection.
chapter: Types and narrowing
minutes: 13
status: draft
---

## A union is either

```ts
type Level = 'quiet' | 'loud';
type Id = string | number;

function format(id: Id): string {
  return String(id);
}
```

A value of a union type is one of the members. `Id` is a `string` or a `number`, and that is the whole idea: instead of
saying the value is a `string` and hoping, the type says which values are possible and the compiler makes you handle
them.

```ts
function size(id: Id): number {
  return id.length;
}
```

```text
error TS2339: Property 'length' does not exist on type 'Id'.
  Property 'length' does not exist on type 'number'.
```

Only the members common to every arm are available without narrowing, which is why a union of object types exposes very
little. The narrowing lesson is the way through it.

## A union of objects shares only the common shape

```ts
type Event =
  | { kind: 'started'; id: number }
  | { kind: 'finished'; id: number; ok: boolean };

function describe(event: Event): string {
  return `${event.kind} ${event.id}`;
}
```

`kind` and `id` are on both arms, so both are readable. `ok` is on one arm, so it is not, and reading it is an error
until the union is narrowed to the arm that has it. That behaviour is the reason to put a literal `kind` on every arm:
it is the property that makes narrowing possible, and it turns a union of shapes into a discriminated union.

## An intersection is both

```ts
type Named = { name: string };
type Sized = { size: number };
type File = Named & Sized;

const file: File = { name: 'a.txt', size: 12 };
```

An intersection requires every member of every part. `&` is used far less than `|`, and its main use is combining two
shapes into one: a base set of fields plus an extension.

```ts
type Audited<T> = T & { createdAt: string; updatedAt: string };

const row: Audited<Named> = { name: 'a', createdAt: '', updatedAt: '' };
```

That is a mixin at the type level, and it is how a helper adds fields to whatever it is given.

## An impossible intersection is never

```ts
type Impossible = string & number;

const value: Impossible = 'a';
```

```text
error TS2322: Type '"a"' is not assignable to type 'never'.
```

Nothing is both a string and a number, so the intersection is `never` and the error names that type. The message is
worse than the mistake, which is why a `never` in an error usually means an intersection of two incompatible types
somewhere above the line.

```ts
type Conflict = { a: string } & { a: number };

const row: Conflict = { a: 'x' };
```

```text
error TS2322: Type 'string' is not assignable to type 'never'.
```

Two shapes that disagree about a property intersect that property to `never`, and the error lands at the value rather
than at the type. An interface that extends both reports it at the interface instead, which is one of the few places the
two declarations differ in behaviour.

## Union or intersection, and where it gets read

```ts
type A = { a: string };
type B = { b: string };

type Either = A | B;
type Both = A & B;
```

`Both` needs an `a` and a `b`. `Either` needs an `a` or a `b`, and reading either one requires a check. That is the
whole difference in one example, and it explains why `|` is the tool for modelling choices and `&` for composing
shapes.

## A union of literals is the usual enum

```ts
type Direction = 'north' | 'south';
type Result = 'ok' | 'error';
type Endpoint = `/${string}`;
```

A union of string literals is readable in an error message, works with a `Map` key, serialises as it appears in the
source and needs no import. An enum is the alternative, and the lesson on enums covers when it is worth the extra
machinery.

## The array cases

```ts
const either: (string | number)[] = ['a', 1];
const both: string[] | number[] = ['a', 'b'];
```

The first is an array whose elements may be a string or a number, mixed freely. The second is an array that is all
strings or all numbers, and you cannot push a string into it without narrowing, because the compiler does not know which
it is. The brackets decide: `(A | B)[]` against `A[] | B[]`, and they are different types.

## Where a union is not enough

```ts
type Response = { status: number; body: string };
```

A single object with a `status` field accepts a 200 with a body and a 500 with a body, and it cannot express that a 204
has neither. A union can:

```ts
type Response =
  | { status: 200; body: string }
  | { status: 204 }
  | { status: 500; error: string };
```

That is the discriminated union pattern in full, and it is the subject of the lesson after next and of a chapter of its
own later.

## Check yourself

Write a union of three object types with a shared literal property and try to read a property that only one of them has.
Then intersect two shapes with a conflicting property and read the error, and do the same with two interfaces and
compare where the error is reported.
