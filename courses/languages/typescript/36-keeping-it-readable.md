---
title: Keeping it readable
summary: What a clever type costs a maintainer, and the rules that keep a signature legible.
chapter: Composing types
minutes: 12
status: draft
---

## A type costs a reader

```ts
function pick<T extends Record<string, unknown>, K extends keyof T>(object: T, keys: K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, object[key]])) as Pick<T, K>;
}
```

That signature is correct and it takes three readings to be confident about what it returns. The cost is paid every time
somebody changes the function, and it is paid again by everyone who reads an error message from a call site.

The alternative is a smaller promise:

```ts
function pick<T>(object: T, keys: (keyof T)[]): Partial<T> {
  return Object.fromEntries(keys.map((key) => [key, object[key]])) as Partial<T>;
}
```

`Partial<T>` is less precise than `Pick<T, K>`: the caller has to check each property rather than knowing exactly which
keys are present. It is also readable at a glance, which is the trade. Where the precision matters, the first version
earns its cost; where it does not, the second one is better.

## Name the type

```ts
function load(options: { retries: number; timeout: number; onError: (error: Error) => void }): void { }
```

An inline shape of that length is unreadable and it cannot be reused or documented. A name fixes both:

```ts
type LoadOptions = {
  retries: number;
  timeout: number;
  onError: (error: Error) => void;
};

function load(options: LoadOptions): void { }
```

A name also improves the error message: the compiler prints `LoadOptions` rather than the whole shape, which is the
practical benefit of naming a type even when it appears once.

## Aliases make errors shorter

```ts
type RowKey = string & { readonly brand: unique symbol };
```

That is a branded type from the modelling chapter, and the reason it is named is that a reported error says `RowKey`
rather than `string & { readonly brand: unique symbol }`. Two or three layers of composition produce a type whose
expansion is half a screen, and a name collapses it.

The same applies to a mapped type: hovering a value of `DeepPartial<Config>` prints the name if it is named and the full
expansion if it is written inline.

## Prefer a union to a conditional

```ts
type Input = string | string[] | Buffer;
```

A union of the accepted shapes is readable and the error message lists the options. A conditional type over the same
inputs produces a message that names the branches instead, and a reader has to work out which branch was taken. Where a
choice can be expressed as a union, it should be.

```ts
function read(input: Input): string { }
```

## Keep the signature on a line

A signature that does not fit on one line is worth splitting, and a signature that needs a comment to explain is worth
simplifying. Two habits that help:

```ts
// The input and the output, each named.
type RowResult = Result<Row, ParseError>;

function parse(text: string): RowResult { }
```

A name for the result keeps the signature short and gives the reader somewhere to look. Where a function needs four type
parameters, the answer from the generics chapter applies: group them into one type or split the function.

## The rules I apply

1. A type that needs a comment to be understood is a type that is too complicated, not a type that is documented.
2. Name any shape longer than about three properties, and any composition of two operators or more.
3. Prefer a union to a conditional, an overload pair to a conditional branch, and a plain type to both.
4. Keep a generic to the parameters that carry a relationship. One that appears once is noise.
5. Read the error message a caller would see before merging a clever type. If it does not name the problem, rewrite the
   type.

The last rule is the one that catches most of it, and the way to apply it is to break a call site on purpose and read
what the compiler says. A signature whose failure message names a type the caller has never heard of will be replaced by
whoever hits it next, and the replacement is likely to be `any`.

## Where the effort is worth it

```ts
type EventName = `${Level}-${Suffix}`;
```

A type built for the call site, where the caller writes a literal and gets a check for free, is worth a lot of work. A
route, an event name, a SQL table and a configuration key all belong in that group, because the check lands where the
mistake is made and the reader never sees the type itself.

A type built to describe an internal helper, where the only reader is the maintainer of the file, is worth much less. The
test is whether the type prevents a mistake at a call site or only satisfies a desire for precision.

## Check yourself

Take a function in a codebase with an inline object parameter and give the shape a name. Then take a signature with two
generic parameters and ask whether the second carries a relationship; if it does not, remove it and see whether any call
site stops compiling.
