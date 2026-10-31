---
title: Template literal types
summary: Building a string type from parts, the four case helpers, and the unions that multiply.
chapter: Composing types
minutes: 12
status: draft
---

## A string pattern as a type

```ts
type Route = `/${string}`;
type Header = `${string}: ${string}`;

const route: Route = '/rows';
const bad: Route = 'rows';
```

```text
error TS2322: Type '"rows"' is not assignable to type '`/${string}`'.
```

A template literal type matches a string by shape, so `Route` accepts any string starting with a slash and rejects the
rest. The check happens on a string literal and it is free at run time, which makes it useful for a value that is built
from constants.

## Parts combine into a union

```ts
type Level = 'quiet' | 'loud';
type Suffix = 'start' | 'end';

type EventName = `${Level}-${Suffix}`;
```

`EventName` is `'quiet-start' | 'quiet-end' | 'loud-start' | 'loud-end'`: four names from two unions of two. The number of
results is the product of the parts, which is the property that makes this powerful and the property that makes it
dangerous on a large union.

```ts
type Big = `${`${string & {}}` & string}-${string & {}}`;
```

A template over a bare `string` produces `string`, so the combination is only interesting when the parts are literals. The
moment one part is a big union, the type has that many members, and the compiler has to hold them all.

## The four case helpers

```ts
type Upper = Uppercase<'abc'>;
type Lower = Lowercase<'ABC'>;
type Cap = Capitalize<'abc'>;
type Uncap = Uncapitalize<'Abc'>;
```

`Upper` is `'ABC'`, `Lower` is `'abc'`, `Cap` is `'Abc'` and `Uncap` is `'abc'`. Those four are intrinsic: the compiler
implements them rather than the type system deriving them, so they are the only string operations available at the type
level. Everything else is built from them and from `infer`.

They take a `string` and a literal confirms the result:

```ts
type Cap = Capitalize<'abc'>;

const cap: Cap = 'Abc';
```

## Deriving a property name

```ts
type Level = 'quiet' | 'loud';

type LevelFlags = {
  [K in Level as `is${Capitalize<K>}`]: boolean;
};
```

`LevelFlags` is `{ isQuiet: boolean; isLoud: boolean }`. That is a mapped type with a remapped key and a template literal
in the new name, which is how an API of derived accessors is generated from a data type. The `Capitalize` is needed
because a property name starting with a lowercase letter reads as a field rather than as a flag.

## Reading a string apart

```ts
type Split<T> = T extends `${infer Head}.${infer Rest}` ? [Head, Rest] : never;

type Parts = Split<'api.v1.rows'>;
```

`Parts` is `['api', 'v1.rows']`, and the split happens at the first dot. Recursing on `Rest` is how a dotted path is
turned into a tuple:

```ts
type SplitAll<T> = T extends `${infer Head}.${infer Rest}` ? [Head, ...SplitAll<Rest>] : [T];

type All = SplitAll<'a.b.c'>;
```

`All` is `['a', 'b', 'c']`. That is a recursive conditional type over a template literal, and it is the tool for typing a
path into a nested object. It is also the kind of type that produces a one-line error message that fills a screen when
the input is wrong, so it belongs in a library behind a name.

## Where a template literal type belongs

- A value built from constants, such as a route, an event name or a CSS custom property.
- A derived accessor or handler name, generated with a mapped type.
- A string pattern that a function parses, so the caller's literal is checked before the parse.
- A prefix or namespace: `` `app:${string}` `` for a storage key.

Where the string is assembled at run time from arbitrary input, the type can only be `string` and the pattern is no help.
The check is on literals, so it is worth the effort exactly when the call site writes the literal out.

## The cost

A template literal over a union of ten and a union of ten produces a hundred members, and a chain of two such types
produces ten thousand. The compiler will do the work and the editor will become slow, and the error message for a mistake
will list members until it gives up and truncates. Two rules that keep this in hand:

- Keep the unions small, or derive the type lazily with a generic rather than instantiating it at every use.
- Put the type behind a name so a hover prints the name rather than the expansion.

## Check yourself

Write a route type, a header type and an event name built from two unions, and hover the event type to count the members.
Then write the recursive split from a dotted path and check the result on a path of four segments.
