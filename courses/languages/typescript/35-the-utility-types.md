---
title: The utility types
summary: The standard library's mapped and conditional types, what each one does, and the three that surprise.
chapter: Composing types
minutes: 13
status: draft
---

## The mapped ones

```ts
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
```

Those five are mapped types, and they are the definitions from the compiler's `lib.es5.d.ts`. `Omit` is built from two
of them:

```ts
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

That is worth reading twice, because it explains the behaviour everyone trips over: `Pick` takes the keys that remain
after `Exclude` removes the ones named, so the other properties keep their types and their modifiers. It also means
`Omit<T, K>` accepts a key that is not in `T` at all, because `K` is only constrained to `keyof any`:

```ts
type Row = { key: string; value: number };

type Without = Omit<Row, 'missing'>;
```

`Without` is `Row`, with no error. `Pick` would have rejected `'missing'`, because it constrains `K` to `keyof T`. That
difference is deliberate and it is one of the two surprises in this list.

## The conditional ones

```ts
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T & {};
```

`Exclude` removes the members of a union assignable to `U`, and `Extract` keeps them. `NonNullable` is written as an
intersection with `{}`, which is the type that excludes `null` and `undefined`, so the intersection does the filtering
without a conditional. That definition is the reason `{}` was worth understanding in the built-in types lesson.

```ts
type Level = 'quiet' | 'loud' | null;

type NotNull = NonNullable<Level>;
type Loud = Exclude<Level, 'quiet' | null>;
```

`NotNull` is `'quiet' | 'loud'` and `Loud` is `'loud'`.

## The function ones

```ts
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type ConstructorParameters<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: infer P) => any ? P : never;
type InstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;
type ThisParameterType<T> = T extends (this: infer U, ...args: never) => any ? U : unknown;
```

Those five read a type out of a function or a class. `ReturnType` and `InstanceType` fall back to `any` rather than
`never`, which is a deliberate choice and it means a mistake in the input is silent. A `never` result and an `any` result
are both worth noticing when a utility type is not doing what you expect.

```ts
const parse = (text: string): Row => ({ key: text, value: 0 });

type ParseArgs = Parameters<typeof parse>;
type ParseResult = ReturnType<typeof parse>;
```

`typeof parse` is needed because `parse` is a value and the utility takes a type. That is the bridge between the two
namespaces from the earlier lesson.

## NoInfer

```ts
function unionOf<T extends string>(values: T[], fallback: T): T {
  return fallback;
}

const widened = unionOf(['a', 'b'], 'c');
```

Hovering `widened` shows `'a' | 'b' | 'c'`. The type parameter was inferred from both arguments and the two candidates
were unioned, so the second argument widened the first. Adding `NoInfer` to the fallback stops that:

```ts
function strict<T extends string>(values: T[], fallback: NoInfer<T>): T {
  return values[0] as T;
}

const narrowed = strict(['a', 'b'], 'c');
```

```text
error TS2345: Argument of type '"c"' is not assignable to parameter of type '"a" | "b"'.
```

`T` is now decided by the array alone and the fallback is checked against it, which is what a default argument should do.
That is the case `NoInfer` exists for: a parameter that should be validated against the type rather than contributing to
it.

`NoInfer` shares its name with an intrinsic, which is to say the compiler implements the behaviour rather than the type
system deriving it, so reading its definition in the library tells you nothing.

## What each one is for

| Utility | Use |
| --- | --- |
| `Partial<T>` | a patch or an update, where every field is optional |
| `Required<T>` | a filled-in value, after a validation step |
| `Readonly<T>` | a value that must not change |
| `Pick<T, K>` | a narrow view of a wide type, such as a list row |
| `Omit<T, K>` | a type without its identity or audit fields |
| `Record<K, V>` | a lookup table, especially over a union of keys |
| `Exclude<T, U>` | removing a member from a union |
| `Extract<T, U>` | keeping a member of a union |
| `NonNullable<T>` | after a check has removed the missing cases |
| `ReturnType<T>` | naming what a function gives back |
| `Awaited<T>` | the value type behind a promise |

`Readonly` is shallow, `Partial` applies to one level, and neither is recursive. A deep version is a recursive mapped type
and it is worth writing only where the nesting is part of the domain.

## Check yourself

Write a wide type and derive a narrow one with `Pick` and with `Omit`, then hover both and compare the modifiers. Pass a
key that does not exist to each and read what happens. Finally take a function, derive its parameters and its return
type, and check both against the source.
