---
title: Type parameter defaults
summary: Making a generic usable without writing it out, and the cases where a default hides a mistake.
chapter: Generics
minutes: 12
status: draft
---

## A default makes a parameter optional

```ts
type Paged<T, K extends keyof T = keyof T> = {
  items: T[];
  sort: K;
};

const byAnything: Paged<Row> = { items: [], sort: 'key' };
const byKey: Paged<Row, 'key'> = { items: [], sort: 'key' };
```

`Paged<Row>` is `Paged<Row, keyof Row>`, and a caller that needs a narrower sort writes the second argument. The default
is what makes the type usable in the common case without forcing every caller to name a parameter they do not care
about, and it is the reason the standard library's types read as well as they do.

The default can refer to an earlier parameter, which is how `K extends keyof T = keyof T` works: `T` is known by the time
the default for `K` is evaluated.

## Inference wins over the default

```ts
function create<T = string>(value?: T): T | undefined {
  return value;
}

const fromNothing = create();
const fromArgument = create(1);
```

`fromNothing` is `string | undefined`, because nothing was there to infer from and the default applied. `fromArgument` is
`number | undefined`, because inference found a `number` and the default was not needed.

That ordering matters: a default is a fallback rather than a constraint, so it cannot be used to force a type. Where a
type must be specific, a constraint is the tool and the default is only there for the case with no information.

## A default on a function type parameter

```ts
type Handler<E = Error> = (error: E) => void;

const onError: Handler = (error) => console.log(error.message);
const onDomainError: Handler<NotFoundError> = (error) => console.log(error.key);
```

A default of `Error` makes `Handler` usable without a type argument, and the narrower form is there when it is needed.
The same shape appears in every callback type in a framework, which is why an options type with a default often has one
only to keep the call site short.

## A default with a constraint

```ts
type Cache<K extends string = string, V = unknown> = Map<K, V>;
```

A default has to satisfy the constraint, and the compiler reports it when it does not:

```ts
type Broken<K extends string = number> = Map<K, unknown>;
```

```text
error TS2344: Type 'number' does not satisfy the constraint 'string'.
```

The message is the same one a violated constraint produces at a call site, which is consistent and worth recognising.

## Defaults on a class

```ts
class Stack<T = unknown> {
  private items: T[] = [];
}

const open = new Stack();
const typed = new Stack<number>();
```

A default on a class parameter means `new Stack()` compiles, which is convenient and slightly dangerous: `Stack<unknown>`
accepts a push of some values and refuses others in a way that depends on the methods, so an unparameterised class is
usually a sign that a type argument was forgotten.

## Where a default hides a mistake

```ts
type Response<T = unknown> = { data: T };

const response: Response = { data: fetched };
```

That compiles and `response.data` is `unknown`, so the value cannot be used without a check. The default did its job of
making the type usable and in doing so it removed the information a caller needed. Where the type argument can be
inferred from a value, inferring it is what a factory or a wrapper function is for:

```ts
function wrap<T>(data: T): Response<T> {
  return { data };
}

const typed = wrap({ key: 'a' });
```

`typed.data` is `{ key: string }`, because the function inferred it. The default is for the case where no value is
available to infer from, and a default of `unknown` is the honest choice there because it forces a check rather than
pretending.

## Check yourself

Write a type with two parameters where the second has a default referring to the first, and use it with and without the
second argument. Then give a class parameter a default, construct it without an argument, and push two different types
into it to see what the compiler allows.
