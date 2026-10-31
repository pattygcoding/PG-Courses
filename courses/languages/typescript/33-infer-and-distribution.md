---
title: infer and distribution
summary: Reading a type out of another one, and the recursion that makes Awaited work.
chapter: Composing types
minutes: 13
status: draft
---

## infer declares a type from a position

```ts
type Return<T> = T extends (...args: never[]) => infer R ? R : never;

type Value = Return<() => string>;
```

`Value` is `string`. The `infer R` declares a type parameter at that position in the pattern, and the compiler fills it
in from the type being checked. That is the whole mechanism: `extends` matches a shape, `infer` names a piece of it.

```ts
type Parameters2<T> = T extends (...args: infer P) => unknown ? P : never;

type Args = Parameters2<(a: string, b: number) => void>;
```

`Args` is `[a: string, b: number]`, a tuple, because a parameter list is a tuple and `infer P` captures it as one. The
standard library's `Parameters` and `ReturnType` are these two lines with a constraint added.

## Reading an element out

```ts
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;

type Row = { key: string };

type One = ElementOf<Row[]>;
type Many = ElementOf<readonly string[]>;
```

`One` is `Row` and `Many` is `string`. That is the tool for naming the element type of anything array-like, including a
`readonly` array, and it works where `T[number]` needs the constraint `T extends readonly unknown[]`.

## Unwrapping a promise

```ts
type Unwrap<T> = T extends Promise<infer V> ? V : T;

type Value = Unwrap<Promise<number>>;
type Same = Unwrap<string>;
```

`Value` is `number` and `Same` is `string`, because the conditional falls through when the shape does not match. The
standard library's `Awaited` is the recursive version of this and it is worth reading, because it handles a promise of a
promise and a thenable:

```ts
type Awaited<T> =
  T extends null | undefined ? T
  : T extends object & { then(onfulfilled: infer F, ...args: infer _): any }
    ? F extends ((value: infer V, ...args: infer _) => any) ? Awaited<V> : never
    : T;
```

Two things to take from that: `infer _` names a position that is not used, which is the convention for an ignored
capture, and the recursion is what makes a nested promise collapse. A recursive conditional type like this is the tool
for a wrapper of unknown depth.

## Several infer positions at once

```ts
type Split<T> = T extends `${infer Head}.${infer Rest}` ? [Head, Rest] : never;

type Parts = Split<'api.v1.rows'>;
```

`Parts` is `['api', 'v1.rows']`, because the template literal pattern matched at the first dot. That is a template
literal type being used as a pattern, which is the subject of the next lesson, and combining it with `infer` is how a
type can be parsed out of a string literal.

## A constrained infer

```ts
type FirstString<T> = T extends readonly [infer H extends string, ...unknown[]] ? H : never;

type Head = FirstString<['a', 1]>;
type NotAHead = FirstString<[1, 'a']>;
```

`Head` is `'a'` and `NotAHead` is `never`, because the first element does not satisfy the `extends string` in the capture.
A constrained `infer` is the way to require something about the captured type without a second conditional, and it is
worth using where the alternative is two nested conditionals.

## Distribution with infer

```ts
type UnionToIntersection<T> =
  (T extends unknown ? (value: T) => void : never) extends (value: infer I) => void
    ? I
    : never;

type Both = UnionToIntersection<{ a: string } | { b: number }>;
```

`Both` is `{ a: string } & { b: number }`. That type is the reason the tuple wrapper matters: the first conditional
distributes over the union, producing several function types, and the second conditional infers from them together, which
produces an intersection. It is a well known trick and it is not obvious, which is why it is worth knowing as a pattern
rather than deriving.

## Where infer is worth it

- Naming something out of a library's type that is not exported, such as the element type of an iterable.
- Writing a wrapper that preserves what it wraps, which is what a `Result` or a validation helper needs.
- Reading a signature out of a function type so a test can assert on it.

The cost is the same as the conditional type's: the error messages, and the fact that a maintainer has to reason about a
pattern match rather than read a type. A `ReturnType` of a function you own is usually simpler written as an explicit
type alias, and a type that reads a parameter out of a function is usually simpler with a second function type.

## Check yourself

Write `ReturnType` and `Parameters` yourself and compare them with the standard library's. Then write `Unwrap` for a
promise and check it against `Awaited`, including the case of a promise of a promise.
