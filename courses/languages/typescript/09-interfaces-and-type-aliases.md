---
title: Interfaces and type aliases
summary: Two ways to name a type, what each can do that the other cannot, and how to choose.
chapter: Types and narrowing
minutes: 13
status: draft
---

## Two spellings for an object shape

```ts
interface Row {
  key: string;
  value: number;
}

type RowAlias = {
  key: string;
  value: number;
};
```

For checking a value, those are the same type. Everything in the previous lesson about structural typing and the
excess property check applies to both, and a value of one is assignable to the other.

The differences are in what each declaration is allowed to do.

## What only a type alias can express

```ts
type Level = 'quiet' | 'loud';                  // a union
type Pair = [string, number];                     // a tuple
type Key = keyof Row;                              // a type operator
type Mapped = { [K in Key]: string };               // a mapped type
type WithId = Row & { id: number };                  // an intersection
type Maybe<T> = T | undefined;                        // a generic alias
```

An interface describes an object shape and nothing else. A union, a tuple, a conditional type and a type built from
another type all need a type alias, because there is no object to attach an interface to.

## What only an interface can do

```ts
interface Window {
  title: string;
}

interface Window {
  theme: string;
}

const window: Window = { title: 'a', theme: 'b' };
```

Two interfaces with the same name in the same scope merge into one, which a type alias cannot do: a second `type Row`
is a duplicate identifier error. Merging is how a library adds a field to a type it does not own, and it is also how a
typo in a name silently creates a second interface rather than an error.

```ts
interface Audited extends Row, Serializable {
  audit: string;
}
```

An interface extends several interfaces, which a type alias does with an intersection. The difference shows in error
messages: an interface that extends a member with a conflicting type reports the conflict where the interface is
declared, and an intersection with conflicting types reports it at the point of use.

## A class implements either

```ts
type Named = { name: string };

class Row implements Row {
  constructor(public key: string) {}
}
```

`implements` accepts an interface or a type alias of an object type, because it is a structural check rather than a
nominal one. That surprises people who expect `implements` to require an interface; what it requires is a shape the
class satisfies.

The class does not inherit anything from either: `implements` checks that the class has the members, and adds nothing.

## Which to reach for

My rule is a type alias by default and an interface when one of the three features above is wanted:

| Situation | Choose |
| --- | --- |
| An object shape | either, so `type` by default |
| A union, tuple or computed type | `type` |
| A published API shape | `interface`, for the error messages and for merging |
| A class contract | `interface`, so a consumer can extend it |
| Anything needing declaration merging | `interface` |

The argument for `type` by default is that it is uniform: one keyword covers object shapes, unions and the operators,
so a reader does not have to know which declarations can be extended. The argument for `interface` on a published API
is that a consumer can add to it, which is what makes it extensible without a new release.

## Call and construct signatures

```ts
interface Parser {
  (text: string): Row[];
  options: { strict: boolean };
}

interface RowFactory {
  new (key: string): Row;
}
```

An interface can describe a callable or a constructible value, which a type alias writes with a function type or an
object with a `new` member. That is how a library types a function that also has properties, which is common in
JavaScript code.

## An interface in a global script merges globally

```ts
// A file with no import or export is a script, and its interfaces are global.
interface Config {
  mode: string;
}
```

A file with no top level `import` or `export` is treated as a global script, so its declarations land in the global
scope and merge with anything else of the same name, including a library's. That is the mechanism behind augmenting
`Window` or a process environment, and it is also the source of a name collision nobody expected.

The fix for a file that was never meant to be global is to add an `export`, which makes it a module and scopes
everything in it. `moduleDetection: "force"` in `tsconfig.json` makes the compiler treat every file as a module
regardless, which removes the trap.

## Check yourself

Write the same object shape as an interface and as a type alias and assign a value of one to the other. Then merge two
interfaces, and try the same with two type aliases. Finally add `export` to a file with a global interface and explain
what changed.
