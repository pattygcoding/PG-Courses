---
title: keyof and indexed access
summary: Getting the union of an object's keys, and the type at one of them, without writing either twice.
chapter: Composing types
minutes: 12
status: draft
---

## keyof gives the union of keys

```ts
type Row = { key: string; value: number };

type RowKey = keyof Row;
```

`RowKey` is `'key' | 'value'`. The type is derived from the object rather than written out, so renaming a property
changes the union in the same edit and every use of it is checked.

```ts
const keys: RowKey[] = ['key', 'value'];
const other: RowKey[] = ['missing'];
```

```text
error TS2322: Type '"missing"' is not assignable to type '"key" | "value"'.
```

With an index signature, `keyof` is the signature's key type:

```ts
type Counts = Record<string, number>;
type CountKey = keyof Counts;
```

`CountKey` is `string | number`, because an object index can be reached with a number as well as a string. That is why
a function constrained by `K extends keyof T` works for both a fixed shape and a dictionary.

## keyof on a union is the intersection

```ts
type A = { a: string; shared: number };
type B = { b: string; shared: number };

type BothKeys = keyof (A | B);
```

`BothKeys` is `'shared'`, because a value of the union type might be either member and only a property on both is safe to
read. The result is an intersection of the key sets, which is the opposite of the union you might expect and it is
consistent with the rule that only common members are readable on a union.

`keyof` on an intersection is the union of the keys:

```ts
type AllKeys = keyof (A & B);
```

`AllKeys` is `'a' | 'b' | 'shared'`, because a value of the intersection has all three.

## Indexed access gives the type at a key

```ts
type Row = { key: string; value: number };

type KeyType = Row['key'];
type AnyValue = Row[keyof Row];
```

`KeyType` is `string` and `AnyValue` is `string | number`. With a union of keys the result is the union of those
properties, which is how a function that reads a dynamic key is typed:

```ts
function valuesOf<T>(object: T): T[keyof T][] {
  return Object.values(object) as T[keyof T][];
}
```

The cast is needed because `Object.values` returns `any[]` for a generic input. That is a small, contained use of `as`,
which is the shape to aim for.

## Indexing an array or a tuple

```ts
type Levels = ['quiet', 'loud'];

type Level = Levels[number];
type First = Levels[0];
```

`Levels[number]` is `'quiet' | 'loud'`, the union of every element, and `Levels[0]` is `'quiet'`. That is the pattern
from the tuples lesson for deriving a union from a value, and it works the same on an array type:

```ts
const LEVELS = ['quiet', 'loud'] as const;

type Level = (typeof LEVELS)[number];
```

`typeof LEVELS` is the value's type, `[number]` takes the union of the elements, and the result is the union of literals.
Three operators and no duplication.

## Optional and readonly properties

```ts
type Options = { retries?: number; readonly mode: string };

type Retries = Options['retries'];
type Mode = Options['mode'];
```

Two details worth knowing, both verified by hovering:

- `Retries` is `number`, not `number | undefined`. Indexed access gives the declared type of the property, while reading
  `options.retries` gives `number | undefined`, because the property may be absent. The optionality is a fact about the
  object, and the indexed access names the type of the value when it is there. Turning on
  `exactOptionalPropertyTypes` changes this so that the indexed access includes `undefined`, which is one more reason the
  flag is a deliberate decision.
- `Mode` is `string` with the `readonly` modifier dropped. `readonly` is a property modifier rather than part of the
  value's type, so it survives on a property and not on a type read out of one. A mapped type is how you preserve the
  modifiers, which is the next lesson.

```ts
type Tags = string[];
type Element = Tags[number];
```

An array's element type is `T[number]`, which is the general way to say "the thing this array holds" and works for a
tuple as well.

## Reading a nested type

```ts
type Config = { database: { host: string; port: number } };

type Db = Config['database'];
type Port = Config['database']['port'];
```

Indexed access chains, so a nested type can be named without repeating the declaration. That is how a function is typed
to take a piece of a configuration object, and it is the pattern behind the utility types:

```ts
function connect(config: Config['database']): void { }
```

The parameter is typed from the configuration rather than from a second interface that has to be kept in step, and a
change to the configuration reaches the function.

## Check yourself

Write an object type, derive its keys with `keyof` and one property type with an indexed access, then assign an invalid
key to the derived union and read the error. Finally derive a union from an array of literals with `as const` and
`[number]`.
