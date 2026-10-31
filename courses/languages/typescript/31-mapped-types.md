---
title: Mapped types
summary: Building a type from another type's keys, the modifiers, and the utility types this syntax is made of.
chapter: Composing types
minutes: 13
status: draft
---

## A mapped type walks the keys

```ts
type Flags<T> = {
  [K in keyof T]: boolean;
};

type Row = { key: string; value: number };

type RowFlags = Flags<Row>;
```

`RowFlags` is `{ key: boolean; value: boolean }`. The `in` clause iterates the keys and the body decides the type at
each one, which makes this the type-level equivalent of a loop.

```ts
type Handlers<T> = {
  [K in keyof T]: (value: T[K]) => void;
};

type RowHandlers = Handlers<Row>;
```

`RowHandlers` is `{ key: (value: string) => void; value: (value: number) => void }`, which is the shape a table of
per-field handlers has. That is the pattern worth recognising: a mapped type where the body reads `T[K]` relates each key
to its own value type.

## Mapping over a union of literals

```ts
type Level = 'quiet' | 'loud';

type Volume = { [K in Level]: number };
```

Mapping over a union of string literals produces an object with one property per member, so `Volume` is
`{ quiet: number; loud: number }`. That is what `Record<Level, number>` is: the standard library's `Record` is a mapped
type over its first argument, which is why a `Record` over a union requires every key.

## Modifiers and their removal

```ts
type Options = { retries?: number; readonly mode: string };

type Required2<T> = { [K in keyof T]-?: T[K] };
type Mutable<T> = { [K in keyof T]-readonly T[K] };
type Optional<T> = { [K in keyof T]?: T[K] };
type Frozen<T> = { readonly [K in keyof T]: T[K] };
```

A `?` adds optionality, `-?` removes it, `readonly` adds the modifier and `-readonly` removes it. The minus sign is the
whole syntax for removal, and it is easy to miss when reading a signature.

A mapped type written as `[K in keyof T]` with the modifiers intact is called homomorphic, which means it copies the
modifiers and the optionality from the source. That is why `Partial<T>` preserves the `readonly` of each property, and
why a mapped type over something other than `keyof T` does not:

```ts
type Rewritten<T> = { [K in keyof T]: T[K] | undefined };
```

That one keeps the modifiers, because the `in` clause is `keyof T`. Writing the keys out by hand instead would lose them.

## Renaming a key

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

The `as` clause remaps the key, and the template literal type builds the new name. `string & K` is needed because `K`
could be a number or a symbol and `Capitalize` takes a string. The result for a two-property type is a type with
`getKey` and `getValue`:

```text
{ getKey: () => string; getValue: () => number }
```

That is how an accessor interface is generated from a data type, and it is the kind of signature a library writes once
rather than an application writes often.

## Filtering keys

```ts
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
```

A key that remaps to `never` is dropped, so this produces a type with only the string valued properties. The conditional
in the `as` clause is doing the filtering, and `never` is the value that means "no key".

```ts
type Row = { key: string; value: number; label: string };

type StringFields = OnlyStrings<Row>;
```

`StringFields` is `{ key: string; label: string }`. That is the tool for picking properties by their type rather than by
their name, which `Pick` cannot do.

## The utility types are these two operators

Those five are the definitions from the compiler's own `lib.es5.d.ts`, copied exactly:

```ts
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
```

Reading the standard library's definitions is the fastest way to understand a utility type, and most of them are one
line. `Pick` is a mapped type over a constrained union rather than over `keyof T`, which is why it does not preserve the
modifiers of the properties it picks. `Record` is a mapped type over any key type, which is why a `Record` over a union
of literals requires every key and one over `string` requires none.

## Where it gets too clever

```ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
```

A recursive mapped type works and it can be slow: the compiler has to instantiate it for every use, and a deeply nested
object produces a large type that shows up in every error message from then on. Hovering a value whose type is a
three-level `DeepPartial` prints a screenful, and an error inside it is unreadable.

The rule I use: a mapped type earns its place when it removes a repetition a maintainer would otherwise have to keep in
step. A type built for one or two uses, or one that needs a comment to explain its output, is better written out.

## Check yourself

Write a mapped type that turns every property into a boolean and one that adds `get` to every key, and hover both results.
Then write the same thing as `Partial` and `Required` from the standard library and confirm they match.
