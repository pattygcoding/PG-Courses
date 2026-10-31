---
title: Conditional types
summary: Choosing a type with a check, and the distribution over unions that surprises everyone once.
chapter: Composing types
minutes: 13
status: draft
---

## A type that branches

```ts
type IsString<T> = T extends string ? 'yes' : 'no';

type A = IsString<string>;
type B = IsString<number>;
```

`A` is `'yes'` and `B` is `'no'`. The condition is `T extends U`, which means "T is assignable to U", so the check is the
one an assignment would make. That single form is the whole conditional type, and everything else is how it behaves.

## The standard library's Exclude is one

```ts
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
```

```ts
type Level = 'quiet' | 'loud' | 'silent';

type Loud = Exclude<Level, 'silent'>;
```

`Loud` is `'quiet' | 'loud'`. Reading it in two steps: `T` is the union, so the conditional runs once per member, and
each member that is assignable to `U` becomes `never`. A union with `never` in it collapses, which is how the removal
happens. That per-member behaviour is distribution, and it is the thing to understand before writing one of these.

## Distribution happens on a naked type parameter

```ts
type Box<T> = T extends string ? 'text' : 'other';

type Distributed = Box<string | number>;
```

`Distributed` is `'text' | 'other'`, because the conditional ran once for `string` and once for `number` and the results
were unioned. That is distribution, and it only happens when the checked type is a bare type parameter:

```ts
type NotDistributed = (string | number) extends string ? 'text' : 'other';
```

`NotDistributed` is `'other'`, because that check is not in a generic position: the union as a whole is not assignable to
`string`. Two checks that look identical have different behaviour depending on whether a type parameter is involved.

To stop distribution, wrap the parameter in a tuple:

```ts
type Boxed<T> = [T] extends [string] ? 'text' : 'other';

type Wrapped = Boxed<string | number>;
```

`Wrapped` is `'other'`, because `[string | number]` is not assignable to `[string]`. The one-element tuple is the idiom
for turning distribution off, and it is worth remembering because the alternative is a bug nobody spots.

## boolean is a union of true and false

```ts
type IsTruthy<T> = T extends true ? 'yes' : 'no';

type Result = IsTruthy<boolean>;
```

`Result` is `'yes' | 'no'`, because `boolean` is treated as `true | false` when it distributes. That is the same rule as
above producing a surprising answer, and it is why a conditional type over a boolean sometimes needs the tuple wrapper.

## never distributes to nothing

```ts
type Never = IsString<never>;
```

`Never` is `never`, because the conditional ran zero times. A conditional that produces `never` where a type was expected
usually means the input was `never`, and the error message names `never` rather than the type you were thinking of.

## A conditional with a constraint

```ts
type ElementOf<T extends readonly unknown[]> = T[number];
type FirstOf<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : T[number];
```

A constraint on the parameter and a conditional inside are different things: the constraint says what can be passed, and
the conditional decides what comes out. The second line infers the head of a tuple when there is one and falls back to
the element union otherwise.

## Where a conditional type is the right tool

```ts
type ApiResult<T> = T extends { error: string } ? never : T;
type Unwrap<T> = T extends Promise<infer V> ? V : T;
type Nullable<T> = T extends null | undefined ? never : T;
```

A conditional type is right where the output type depends on the input in a way a mapped type cannot express: removing a
member, unwrapping a wrapper, or choosing between two shapes. It is the wrong tool for a choice between two functions,
which is what overloads are for, and it is the wrong tool for anything that needs a comment to explain.

The cost is the error message. A conditional type reported as wrong prints both branches and a reader has to work out
which one was chosen, which is why a library's types are harder to read than an application's.

## Check yourself

Write `Exclude` and use it on a union, then write the same check without a type parameter and compare the two results.
Then wrap the parameter in a tuple and confirm the distribution stops.
