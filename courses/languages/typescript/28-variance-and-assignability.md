---
title: Variance and assignability
summary: Which type is assignable to which, the unsound case in arrays, and the annotations that describe it.
chapter: Generics
minutes: 13
status: draft
---

## A wider type accepts a narrower one

```ts
type Named = { name: string };
type Row = Named & { value: number };

const row: Row = { name: 'a', value: 1 };
const named: Named = row;
```

A `Row` is assignable to `Named` because it has everything `Named` requires. That is the direction for a value being read:
the consumer asked for a `name` and got more. The technical term is covariance, and it applies to a property, a return
type and a type parameter used only in those positions.

The reverse does not work, because `named` has no `value`:

```ts
const back: Row = named;
```

```text
error TS2741: Property 'value' is missing in type 'Named' but required in type 'Row'.
```

## Function parameters go the other way

```ts
function takesWide(value: string | number): void { }

const narrower: (value: string) => void = takesWide;
```

That is accepted: a function that can handle anything assignable to a `string` is usable where a `string` will be passed.
The direction is the opposite of the value case, which is what contravariance means, and it makes sense once the call is
written out: whoever calls `narrower('a')` is passing a string, and `takesWide` accepts it.

```ts
function takesNarrow(value: string): void { }

const wider: (value: string | number) => void = takesNarrow;
```

```text
error TS2322: Type '(value: string) => void' is not assignable to type '(value: string | number) => void'.
  Types of parameters 'value' and 'value' are incompatible.
    Type 'string | number' is not assignable to type 'string'.
```

The caller of `wider` may pass a number, and `takesNarrow` cannot handle it, so the assignment is refused. That is
`strictFunctionTypes` doing its job, and it is the rule that stops a callback from being handed a type it cannot accept.

The rule in one line: a parameter is contravariant, a return type is covariant, and a value being read is covariant.

## Methods are bivariant, properties are not

```ts
interface WithMethod {
  accept(value: string): void;
}

interface WithProperty {
  accept: (value: string) => void;
}
```

Those two look the same and they are checked differently. Method syntax is bivariant, so it accepts a parameter type in
either direction, which is there for compatibility with existing code. Property syntax is contravariant, so it enforces
the rule above. That is the reason to write a callback type with property syntax and why the difference in the objects
lesson was worth flagging.

## Arrays are covariant and therefore unsound

```ts
const strings: string[] = ['a'];
const mixed: (string | number)[] = strings;

mixed.push(1);
```

That compiles, and at run time `strings` is now `['a', 1]`, which is a string array holding a number. This is the one
place TypeScript is deliberately unsound in a way you can observe, and it exists because widening an array is the
ordinary thing to want:

```ts
const mixed: readonly (string | number)[] = strings;
```

Widening through a `readonly` array is safe, because nothing can be written through it. The mutable version is the unsafe
one, and the difference in the two widening assignments is exactly the `readonly` modifier.

The narrowing direction is refused in both cases, which is the compiler keeping the other half of the promise:

```text
error TS2322: Type 'readonly (string | number)[]' is not assignable to type 'readonly string[]'.
  Type 'string | number' is not assignable to type 'string'.
```

A `readonly string[]` cannot be read as a `readonly (string | number)[]` and back down again, because the array really
might contain a number after the widening. That is why `readonly` matters: it makes the widening sound, and it is the
reason to prefer it on a parameter.

## Variance annotations

```ts
interface Producer<out T> {
  get(): T;
}

interface Consumer<in T> {
  set(value: T): void;
}

interface Invariant<in out T> {
  get(): T;
  set(value: T): void;
}
```

`out` marks a type parameter used only in output positions, `in` one used only in input positions, and `in out` one used
in both. The compiler infers all of this already, so the annotations do not change what is checked for a type it can
analyse.

They matter for a type it cannot analyse, which means a recursive one:

```text
error TS2636: Type 'V' is not assignable to type 'V'.
```

The error appears on a generic type whose parameter is used in a way that makes the variance circular. An explicit `in
out` resolves it, which is the reason the standard library's collection types carry annotations and the reason you might
need one in a type of your own that refers to itself.

## Check yourself

Assign a narrower object to a wider type and the reverse, and read the second error. Then assign a function taking a wide
parameter to a variable expecting a narrow one, and the reverse, recording which is accepted. Finally put a `string[]`
into a `(string | number)[]` and push a number.
