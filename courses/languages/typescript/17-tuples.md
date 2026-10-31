---
title: Tuples
summary: An array with a known length and a type per position, and the labels that make one readable.
chapter: Functions and collections
minutes: 12
status: draft
---

## A tuple has a type per position

```ts
type Entry = [string, number];

const entry: Entry = ['a', 1];
```

A tuple is an array whose length and element types are known, so `entry[0]` is a `string` and `entry[1]` is a `number`
rather than a union. That is the whole difference from `(string | number)[]`, where every index is either type.

The length is part of the check:

```ts
const short: Entry = ['a'];
```

```text
error TS2322: Type '[string]' is not assignable to type '[string, number]'.
  Source has 1 element(s) but target requires 2.
```

The message counts the elements, which is the clearest error in the type system. The same check applies per position:

```text
error TS2322: Type 'number' is not assignable to type 'string'.
error TS2322: Type 'string' is not assignable to type 'number'.
```

Two errors, one for each slot that is the wrong type, which is exactly what a reader needs.

## Labels are for the reader

```ts
const entry: [key: string, value: number] = ['a', 1];

function splitPair(pair: [key: string, value: number]): string {
  return pair[0];
}
```

A label names a position in the type, so hovering a tuple shows `[key: string, value: number]` rather than
`[string, number]`. The labels are not part of the type's identity: a labelled tuple and an unlabelled one with the same
positions are the same type, and the labels do not survive destructuring.

They are worth writing on a function signature because that is where a reader meets the type and has to know which
position is which.

## Optional and rest elements

```ts
type Point3 = [number, number, number?];

const flat: Point3 = [1, 2];
const solid: Point3 = [1, 2, 3];

type Args = [string, ...number[]];

const one: Args = ['a'];
const many: Args = ['a', 1, 2, 3];
```

An optional element must come last, and a rest element collects the tail with its own type. `[string, ...number[]]` is
the tuple form of a function with one required and any number of optional parameters, which is why it appears in the
type of `apply`-style helpers.

The length checks interact with those elements in the way you would hope: `['a']` is assignable to
`[string, ...number[]]` and `[]` is not.

## Destructuring a tuple

```ts
const [key, value] = entry;

function swap(pair: [string, number]): [number, string] {
  return [pair[1], pair[0]];
}
```

Destructuring gives each name the type of its position, so `key` is a `string` and `value` is a `number` with no
annotations. A tuple is how a function returns two values without inventing an object, and it is the right answer when
the values are ordered and short lived.

```ts
async function loadWithStatus(path: string): Promise<[rows: Row[], ok: boolean]> { }
```

An object with named fields is better when the result travels far or when a third value is likely to be added, and a
tuple is better for an immediate destructure at the call site. That is the trade: a tuple is shorter and an object
survives a change.

## Object.entries gives tuples

```ts
const counts: Record<string, number> = { a: 1 };

for (const [name, count] of Object.entries(counts)) {
  console.log(name, count);
}
```

`Object.entries` returns a `[string, T][]`, so a `for...of` over it destructures into a key and a value with the right
types. That is the reason the loop reads so well and the reason a `Map` and an object can be handled the same way.

`Object.entries` widens the key to `string` even when the object has known keys, because the runtime could have more.
A `Map` keeps its key type:

```ts
const byKey = new Map<string, number>();
```

## Deriving a union from an array

```ts
const pair = ['a', 1] as const;
```

`pair` is `readonly ['a', 1]`: a tuple, because the length is known, with literal types, because nothing will change.
That is what lets a value be used where literal types are wanted:

```ts
const LEVELS = ['quiet', 'loud'] as const;

type Level = (typeof LEVELS)[number];
```

`Level` is `'quiet' | 'loud'`, derived from the array rather than written twice. Those two lines are the pattern for
keeping a list of values and the union of those values in one place, and it appears all over well typed code. A later
lesson in this chapter uses the same trick for a lookup table where the keys and the values have to agree.

## A tuple is an array at run time

```ts
const entry: [string, number] = ['a', 1];

console.log(Array.isArray(entry));
```

```text
true
```

There is no tuple at run time, so a function that accepts `[string, number]` can be called from JavaScript with an
array of three elements and the check does nothing. That is the same gap as everywhere else, and it is worth
remembering when the tuple comes from outside the program: a boundary that validates has to check the length itself.

## Check yourself

Write a tuple with three positions, assign an array of two and read the error, then add a label to each position and
hover the type. Finally write an array with `as const`, derive a union from it with an indexed access, and use that union
as a parameter type.
