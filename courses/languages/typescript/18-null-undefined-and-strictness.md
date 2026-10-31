---
title: null, undefined and strictness
summary: The flag that changes the most, the difference between the two missing values, and the assertions that switch it off.
chapter: Functions and collections
minutes: 13
status: draft
---

## strictNullChecks separates the missing values

```ts
let key: string = null;
```

```text
error TS2322: Type 'null' is not assignable to type 'string'.
```

With `strictNullChecks` on, `null` and `undefined` have their own types and are not assignable to anything else. Without
it they are assignable to every type, and a value that might be missing is indistinguishable from one that is not. That
one flag is the reason to turn strict on in a project that has not.

```ts
let key: string | undefined;

key = 'a';
key = null;
```

```text
error TS2322: Type 'null' is not assignable to type 'string | undefined'.
```

The union says which missing value is possible, and the two are different types on purpose. `undefined` is what a
missing value, an absent argument or an absent property is. `null` is a value someone deliberately set. A function
returning `T | undefined` is saying it may not have an answer, and a field typed `T | null` is saying the domain has a
null in it, which is a decision worth making explicitly.

The habit that follows: use `undefined` for absent, and `null` only where an external system requires it, such as a JSON
field that must be present.

## An optional property and undefined

```ts
type A = { key?: string };
type B = { key: string | undefined };
```

Under `exactOptionalPropertyTypes`, `A` allows the property to be absent and `B` requires it to be present. Without
that flag they are the same, and the difference is what the flag exists for. In both cases reading `a.key` gives
`string | undefined`, because the property may be absent.

## Optional chaining produces a union

```ts
type Row = { key: string; meta?: { tags: string[] } };

const row: Row = { key: 'a' };

const count = row.meta?.tags.length;
```

`count` is `number | undefined`, because the chain may have stopped at `meta`. That is the type doing its job: the code
compiles and the caller has to decide what a missing `meta` means.

```ts
const total = row.meta?.tags.length ?? 0;
```

With `??` the type is `number`, because the missing case was given a value. That is the pattern for an optional chain,
and it is why `??` is the operator to pair with one.

```ts
const label = row.meta?.tags.length || 'none';
```

```text
error TS2322: Type 'number | "none"' is not assignable to type 'number'.
  Type 'string' is not assignable to type 'number'.
```

`||` treats `0` as falsy, so the result of that expression is a `number` or a `string`, and the compiler reports it when
the value is used as a number. Choosing `??` says the default is for a missing value; choosing `||` says it is for an
empty one, and the types follow.

## The non-null assertion

```ts
function size(row: Row): number {
  return row.meta!.tags.length;
}
```

A `!` after an expression removes `null` and `undefined` from its type without checking anything. It is the escape hatch
for the case where you know more than the compiler, and it is dangerous in exactly the way that sounds: a later change
that makes the value absent produces a run time error at that line, with no compiler warning, which is the thing the
checker was there to prevent.

Where you do know more, a check is usually shorter than the assertion:

```ts
if (!row.meta) {
  throw new Error(`row ${row.key} has no meta`);
}

return row.meta.tags.length;
```

That version narrows the type, reports a useful message, and keeps the guarantee for the rest of the function. I keep
`!` for one thing: a value assigned in a lifecycle method the compiler cannot follow.

## Definite assignment on a class field

```ts
class Store {
  private connection: Connection;

  constructor() {
    this.connection = createConnection();
  }
}
```

That assignment is fine, because the compiler can see it in the constructor. The error appears when the field is set in
a method instead:

```text
error TS2564: Property 'connection' has no initializer and is not definitely assigned
in the constructor.
```

That is `strictPropertyInitialization`, part of the strict family. Three honest fixes:

```ts
// 1. initialise it.
private connection = createConnection();

// 2. accept that it may be absent and say so.
private connection: Connection | undefined;

// 3. assert that it will be there.
private connection!: Connection;
```

The third is the definite assignment assertion, and it is the one to reach for when the lifecycle really is guaranteed
by the class and the alternative is a `| undefined` on every read. It has the same weakness as `!`: nothing checks it.

## What strict changed about catch

```ts
try {
  parse(text);
} catch (error) {
  console.log(error.message);
}
```

```text
error TS18046: 'error' is of type 'unknown'.
```

A `catch` variable is `unknown` under `useUnknownInCatchVariables`, which is part of strict, because anything at all can
be thrown. The check is the one the JavaScript course argues for on its own:

```ts
catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
}
```

## The places the compiler forces a check

```ts
const found = rows.find((row) => row.key === key);
const count = counts.get(key);
const first = rows[0];
```

`find` and `Map.get` return `T | undefined` with the flag on, so both need a check before use. Those two are the most
common places a missing value appears in ordinary code, and having the compiler ask about them is the bulk of the
benefit of turning strict on.

The third is the exception: an index returns the element type unless `noUncheckedIndexedAccess` is on. An array index is
the one hole in the strictness, and the flag that closes it is in the arrays lesson.

## Check yourself

Turn off `strictNullChecks`, write a function that reads a property of a possibly undefined value, and confirm it
compiles. Turn it back on and read the error. Then write the same read three ways, with `?.`, with `??` and with a check
that throws, and compare the types.
