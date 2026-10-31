---
title: Generic functions
summary: A type parameter that keeps a relationship, and the smell of a generic used once.
chapter: Generics
minutes: 13
status: draft
---

## A type parameter keeps the relationship

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const count = first([1, 2, 3]);
const word = first(['a', 'b']);
```

`count` is `number | undefined` and `word` is `string | undefined`, and nothing was annotated at the call site. The type
parameter is inferred from the argument, and the return type refers to it, which is the whole point: the relationship
between the input and the output is preserved.

The version without a generic loses that:

```ts
function firstAny(items: any[]): any {
  return items[0];
}
```

That compiles and every call site is unchecked, which is the argument against `any` in one example.

## Inference reads the arguments

```ts
function pair<T>(value: T): [T, T] {
  return [value, value];
}

const two = pair('a');
```

`two` is `['a'... ]` hmm, it is `[string, string]`, inferred from the argument. The compiler reads the arguments, works
out the type parameter from them, and then checks the body against the result.

Where the argument does not decide the type, it can be given at the call site:

```ts
const empty: Row[] = [];

function wrap<T>(value: T): T[] {
  return [value];
}

const rows = wrap<Row>({ key: 'a', value: 1 });
```

`wrap<Row>(...)` names the type argument explicitly, and it is necessary when the value would infer something narrower
than wanted or when there is no argument to infer from at all.

## Two parameters and the relationship between them

```ts
function mapRow<T, U>(row: T, map: (value: T) => U): U {
  return map(row);
}

const size = mapRow({ value: 3 }, (row) => row.value);
```

`U` is inferred from the function's return type, and `T` from the first argument. That is the shape every collection
method has, and it is why `map` on a `Row[]` gives you a `string[]` when the callback returns a string.

```ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const keys = pluck([{ key: 'a', value: 1 }], 'key');
```

That is the pattern for reading a named property generically, and `K extends keyof T` is the constraint that makes
`item[key]` a legal expression with the right result type. The constraints lesson takes it apart.

## A generic used once is a smell

```ts
function save<T>(value: T): void {
  store.set(JSON.stringify(value));
}
```

`T` appears in the parameter and nowhere else, so the caller learns nothing from the signature that `unknown` would not
tell them, and the function can do nothing with the value except pass it around. The version that earns its type
parameter produces something containing `T`:

```ts
function wrap<T>(value: T): { value: T } {
  return { value };
}
```

My rule: if the type parameter appears once, replace it with a concrete type, `unknown`, or nothing. The exception is a
deliberate documentation choice such as `readonly T[]`, where the parameter makes the element type visible.

## The identity function

```ts
function identity<T>(value: T): T {
  return value;
}
```

That is the smallest generic function and it does nothing at run time. It is worth writing once to see how inference and
the constraint machinery work, and it is worth knowing that a real identity function is rarely useful. Where it appears
in a codebase it usually marks a place a transform was meant to be.

## Naming the parameters

```ts
function fromEntries<K extends string, V>(entries: [K, V][]): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}
```

The convention is a single capital letter for a simple case and a descriptive name when there are several. `T` for a
general type, `K` for a key, `V` for a value, `U` for a second type in a transformation. A generic function with five
parameters named `T1` to `T5` is a sign it wants to be two functions.

## A generic object type is simpler than a function

```ts
type Wrapper<T> = {
  value: T;
  at: Date;
};

const wrapped: Wrapper<Row> = { value: row, at: new Date() };
```

A generic type alias or interface follows the same rules: the parameter is substituted at the point of use, and
inference happens from the value rather than from the name. This is how `Map<K, V>`, `Promise<T>` and `Record<K, V>` are
written, and the next lessons cover the ways a type parameter can be constrained and composed.

## Check yourself

Write a generic `first` function and call it with an array of numbers and an array of strings, hovering the result both
times. Then write a function whose type parameter appears once and replace the parameter with `unknown`, and describe
what changed for a caller.
