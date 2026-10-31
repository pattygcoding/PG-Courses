---
title: Annotations and inference
summary: When to write a type and when to let the compiler work it out, which is most of the time.
chapter: Types and narrowing
minutes: 13
status: draft
---

## Inference comes from the value

```ts
const key = 'report';
const value = 128;
const rows = [{ key, value }];

console.log(typeof key);
```

Hovering `rows` shows `{ key: string; value: number }[]`, and nothing was annotated. The compiler read the initialisers
and worked out the shape, which means an annotation is usually a choice rather than a requirement.

The rule I follow: annotate the boundary, infer inside it. A function's parameters and return type are the boundary,
and a local variable inside the function is not.

```ts
export function total(rows: { value: number }[]): number {
  const sizes = rows.map((row) => row.value);

  return sizes.reduce((sum, size) => sum + size, 0);
}
```

The signature is written out, and `sizes` and `sum` are inferred. A reader of the signature knows what the function
takes and gives back; a reader of the body is not slowed down by types that the compiler already knew.

## An annotation is a check, not a conversion

```ts
const key: string = 42;
```

```text
error TS2322: Type 'number' is not assignable to type 'string'.
```

Writing a type never converts a value, it states what the value already is. The one place the two get confused is an
assertion, which is a promise to the compiler rather than a check:

```ts
const key = 42 as unknown as string;
```

That compiles and is wrong, which is why `as` deserves the suspicion the previous chapter gave it.

## Where an explicit type earns its place

```ts
// 1. A value whose type is not decided by the initialiser.
function createRow(): Row {
  return { key: '', value: 0 };
}

// 2. An empty collection, which would otherwise have no element type.
const rows: Row[] = [];

// 3. A union the compiler would narrow too far.
let level: 'quiet' | 'loud' = 'quiet';

// 4. A public API, where the signature is documentation.
export function parse(text: string): Row[] { }
```

The second one is the common case, and it fails in two different ways depending on where the array is:

```ts
class Store {
  rows = [];
}

const store = new Store();

store.rows.push({ key: 'a' });
```

```text
error TS2345: Argument of type '{ key: string; }' is not assignable to parameter of type 'never'.
```

A field with an empty array initialiser infers `never[]`, so nothing can be pushed into it. Inside a function that
returns the array before the compiler has seen a push, the message is about an evolving type instead:

```text
error TS7034: Variable 'found' implicitly has type 'any[]' in some locations
where its type cannot be determined.
```

Both are the same problem with different wording: nothing in the code says what the element type is. Writing
`const rows: Row[] = []` settles it, and the third case in the list is worth seeing in full.

## let widens, const keeps the literal

```ts
let level = 'quiet';
const fixed = 'quiet';

level = 'loud';
```

Hovering `level` shows `string` and hovering `fixed` shows `'quiet'`. A `let` can be reassigned so the compiler widens
the initialiser to its type; a `const` cannot, so the literal type is kept. That is why a `const` is assignable where a
union of literals is expected and a `let` is not:

```ts
type Level = 'quiet' | 'loud';

const a: Level = 'quiet';
let b: Level = 'quiet';

b = 'shout';
```

```text
error TS2322: Type '"shout"' is not assignable to type 'Level'.
```

The error is on the value that is not in the union, which is the point: the annotation told the compiler what `b` is
allowed to hold.

## as const freezes the shape

```ts
const config = {
  mode: 'strict',
  levels: ['quiet', 'loud'],
};
```

Hovering `config` shows `{ mode: string; levels: string[] }`, which loses both the literal and the fact that the array
is fixed. An `as const` keeps everything:

```ts
const config = {
  mode: 'strict',
  levels: ['quiet', 'loud'],
} as const;

type Mode = (typeof config)['mode'];
```

Now `config.levels` is `readonly ['quiet', 'loud']`, and `Mode` is `'strict'`. Deriving a type from a value with
`typeof` and an indexed access is the pattern that keeps one source of truth, and it is covered properly later.

The cost is that the value is now readonly, so code that wants to change `config.mode` cannot.

## satisfies checks without widening

```ts
const routes = {
  home: '/',
  about: '/about',
} satisfies Record<string, string>;
```

`satisfies` checks that the value matches a type and keeps the narrower inferred type of the value. An annotation would
have widened `routes` to `Record<string, string>`, losing the keys:

```ts
const annotated: Record<string, string> = { home: '/' };

console.log(annotated.home);
```

That compiles and `annotated.homeless` also compiles, because every key is allowed. With `satisfies`,
`routes.homeless` is an error and `routes.home` is still `'/'` rather than `string`. It is the best of both, and it is
worth reaching for whenever a configuration object needs to be checked against a shape.

## A return type on an exported function

```ts
export function parse(text: string) {
  return text.split(',').map((part) => part.trim());
}
```

That infers `string[]` today. If the body changes to return an object, the inferred type changes silently and every
caller breaks at run time rather than at the point of the change. Writing `: Row[]` on an exported function makes the
compiler check the body against the promise, which is the only place it can complain before the caller does.

That is the whole argument for annotating a boundary: it moves the failure from the caller to the implementation.

## Check yourself

Hover a `const` and a `let` with the same literal and explain the two types. Then write a configuration object with and
without `as const`, hover it both times, and finally add `satisfies` and try to read a key that is not in the object.
