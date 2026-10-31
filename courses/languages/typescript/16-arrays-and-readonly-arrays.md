---
title: Arrays and readonly arrays
summary: The two spellings, the modifier that stops a function changing your data, and what an index returns.
chapter: Functions and collections
minutes: 12
status: draft
---

## Two spellings for an array

```ts
const keys: string[] = ['a'];
const alsoKeys: Array<string> = ['a'];
```

They are the same type. The bracket form is shorter and reads better for a simple element type; `Array<...>` is
sometimes clearer when the element is itself a generic or a function:

```ts
const handlers: Array<(row: Row) => void> = [];
const withBrackets: ((row: Row) => void)[] = [];
```

Both are legal. I write the brackets and switch to `Array<...>` when the element type would need parentheses.

## readonly arrays stop mutation

```ts
function total(rows: readonly Row[]): number {
  return rows.reduce((sum, row) => sum + row.value, 0);
}
```

A parameter of `readonly Row[]` has no `push`, no `splice` and no assignment to an index, so a function that only reads
its array cannot change it by accident. It also accepts a `Row[]`, because a mutable array is assignable to a readonly
one.

The other direction is rejected:

```ts
const frozen: readonly Row[] = [];

const mutable: Row[] = frozen;
```

```text
error TS4104: The type 'readonly Row[]' is 'readonly' and cannot be assigned to
the mutable type 'Row[]'.
```

The error is about the read-only modifier, and its point is that handing a frozen array to a function that may push into
it would be a lie. That is why the modifier propagates: a function that takes `Row[]` cannot be given a readonly array
at all, and a function that takes `readonly Row[]` can be given either.

The habit worth having: default to `readonly` on a parameter and take it off when the function needs to change the
array.

## The methods that mutate and the ones that copy

```ts
const rows: Row[] = [];

rows.push(row);                    // mutates, returns number
rows.sort(byKey);                   // mutates, returns Row[]
const sorted = rows.toSorted(byKey);   // returns a new readonly Row[]
```

The mutating methods are available only on a mutable array, and the copying ones are on both. `toSorted` returns a
`readonly Row[]`, because the array it produced is a fresh one and nothing about it should be changed through a
reference the compiler cannot follow.

| Mutates | Copies |
| --- | --- |
| `push`, `pop`, `shift`, `unshift` | `concat`, `slice`, `map`, `filter` |
| `splice`, `sort`, `reverse` | `toSpliced`, `toSorted`, `toReversed` |
| `fill`, `copyWithin` | `flat`, `flatMap`, `with` |

Reading the type of a method call is how to find out which side of that table it is on, and it is why hovering is worth
more than remembering.

## An index returns the element type

```ts
const rows: Row[] = [];
const first = rows[0];
```

`first` is a `Row`, and at run time it is `undefined`, because the array is empty. That is the one place where the type
is more confident than the value, and the flag that fixes it is `noUncheckedIndexedAccess`:

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  }
}
```

With it on, `rows[0]` is `Row | undefined` and the compiler requires a check. That is correct for everything indexed:
an array index, a key of a `Record`, a match from a regular expression. It is off by default because it adds a check to
every access, and it is worth turning on where an index genuinely can be out of range.

## Narrowing an unknown to an array

```ts
function count(value: unknown): number {
  if (!Array.isArray(value)) {
    return 0;
  }

  return value.length;
}
```

`Array.isArray` narrows an `unknown` to `any[]`, and from there the element types can be narrowed further. The `any[]`
is imperfect: the elements are unchecked, so a validation function that walks them has to check each one.

```ts
function isRowArray(value: unknown): value is Row[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null && 'key' in item)
  );
}
```

A predicate like that is the version that gives the caller a `Row[]` rather than an `any[]`, and it is worth writing
once at the boundary where data arrives.

## The element type of an empty array

```ts
const rows = [];

rows.push({ key: 'a' });
```

An empty array with no annotation has no element type, and the two errors it produces are in the inference lesson. The
short version: write `const rows: Row[] = []` and the problem does not exist.

## Check yourself

Write a function taking `readonly Row[]` and pass it a `Row[]` and a `readonly Row[]`. Then try to pass a
`readonly Row[]` to a function taking `Row[]` and read the error. Finally turn on `noUncheckedIndexedAccess` and index
an empty array.
