---
title: Overloads and call signatures
summary: Several ways to call one function, the implementation signature callers cannot use, and when a union is better.
chapter: Functions and collections
minutes: 13
status: draft
---

## An overload is a list of call signatures

```ts
function parse(input: string): Row[];
function parse(input: string[]): Row[];
function parse(input: string | string[]): Row[] {
  const lines = Array.isArray(input) ? input : input.split('\n');

  return lines.map((line) => parseLine(line));
}
```

The signatures above the implementation are what a caller sees. The implementation signature is the one the body is
checked against, and it is not part of the public list, which produces the error people hit first:

```ts
declare function getInput(): string | string[];

const either = getInput();

parse(either);
```

```text
error TS2769: No overload matches this call.
  Overload 1 of 2, '(input: string): Row[]', gave the following error.
    Argument of type 'string | string[]' is not assignable to parameter of type 'string'.
```

The value has exactly the type the implementation accepts and there is no overload that takes it. The fix is a third
overload taking the union, or dropping the overloads for a single signature. A small list of specific signatures gives a
better message than one wide one, and this is the cost of the list.

## Order decides which overload matches

```ts
function pick(value: string | number): string;
function pick(value: string): number;
function pick(value: string | number): string | number {
  return typeof value === 'string' ? value : value;
}

const result = pick('a');
```

`result` is a `string`, which is surprising, because the second overload is the one written for a string. The first
matching signature wins, and the first accepts everything the second does, so the second is unreachable.

```ts
const asNumber: number = result;
```

```text
error TS2322: Type 'string' is not assignable to type 'number'.
```

The rule is to order the overloads from the most specific to the least, so the narrow signature gets its turn before a
wide one swallows the call. A wide overload above a narrow one is dead code that the compiler does not report, which is
worth a second look in any overload list.

## A union is usually better

```ts
function size(value: string | string[]): number {
  return value.length;
}
```

If both overloads return the same type, one signature taking the union is shorter, has one call signature to read and
produces a better error. Overloads earn their place when the return type depends on which argument was passed:

```ts
function get(key: 'count'): number;
function get(key: 'label'): string;
function get(key: string): number | string {
  return key === 'count' ? 1 : 'label';
}

const count = get('count');
```

`count` is a `number`, because the literal argument selected the first overload. That is the case overloads exist for,
and it is close to what a conditional type or a generic does, which is worth comparing before writing the third
overload.

## A boolean flag is an options object

```ts
function search(text: string, exact: boolean): Row[];
```

A boolean parameter says nothing at the call site, and an overload pair to give it two names is a lot of machinery:

```ts
search('key', true);      // what is true?
```

An options object is the shorter answer for a public API, and it survives a third option being added:

```ts
function search(text: string, options?: { exact?: boolean }): Row[];
```

## Call signatures in an interface

```ts
interface Parser {
  (text: string): Row[];
  options: { strict: boolean };
}
```

An interface can describe a value that is callable and also has properties, which a function declaration cannot
express. If a library exports a function with a `defaults` property on it, that is the type it writes.

```ts
type Parser = {
  (text: string): Row[];
  options: { strict: boolean };
};
```

The type alias version is the same and is the one I reach for, since it composes with the other type operators.

## Construct signatures

```ts
type Factory = {
  new (key: string): Row;
};

function create(Factory: Factory): Row {
  return new Factory('a');
}
```

A construct signature types a class or a constructor function as a value, which is how a dependency injection container
or a factory parameter is typed. A class itself is a value with a construct signature, so `typeof Row` for a class `Row`
is assignable to a `Factory` when the parameters line up.

## Check yourself

Write two overloads with different return types and confirm the return type at the call site by hovering. Then add a
third signature to the implementation that no overload covers and read the error. Finally replace the pair with a union
parameter and say which version you would keep.
