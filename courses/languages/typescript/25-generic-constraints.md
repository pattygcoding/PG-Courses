---
title: Generic constraints
summary: What a type parameter is allowed to do, and the constraint that makes a property access legal.
chapter: Generics
minutes: 13
status: draft
---

## T can do nothing by default

```ts
function size<T>(value: T): number {
  return value.length;
}
```

```text
error TS2339: Property 'length' does not exist on type 'T'.
```

A bare type parameter has no members, because it could be anything at all. A constraint says what the parameter is
allowed to do, and it is the requirement that makes the body check:

```ts
function size<T extends { length: number }>(value: T): number {
  return value.length;
}
```

`size('abc')` and `size([1, 2])` both work, because a string and an array both have a numeric `length`. The constraint is
checked at the call site, and a value that does not satisfy it is an error:

```ts
size(42);
```

```text
error TS2345: Argument of type 'number' is not assignable to parameter of type
'{ length: number; }'.
```

The message names the requirement, which is why the constraint is worth reading as a contract rather than a type trick.

## The keyof constraint

```ts
function get<T, K extends keyof T>(object: T, key: K): T[K] {
  return object[key];
}

const row = { key: 'a', value: 1 };

const key = get(row, 'key');
const value = get(row, 'value');
```

That is the most useful constraint in the language. `K extends keyof T` says the key must be one of the object's
properties, and `T[K]` is the indexed access that produces the type of that property. So `key` is a `string` and `value`
is a `number`, with nothing written twice.

```ts
get(row, 'missing');
```

```text
error TS2345: Argument of type '"missing"' is not assignable to parameter of type '"key" | "value"'.
```

The error lists the allowed keys, which is the autocomplete and the check in one.

## Several constraints

```ts
function merge<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): T {
  return { ...target, [key]: value };
}
```

Constraints can be combined with a `&`, and a parameter can be constrained by another parameter's type. `T extends
object` rules out the primitives, which is what a function that spreads a value needs.

```ts
type HasKey = { key: string };

function label<T extends HasKey & { value: number }>(row: T): string {
  return `${row.key}: ${row.value}`;
}
```

An intersection constraint requires every member, and it is the useful shape for a function that needs several
properties without caring about the rest of the object.

## A constraint is a minimum, not an equals

```ts
function describe<T extends { key: string }>(row: T): string {
  return row.key;
}

const extended = { key: 'a', value: 1, extra: true };

describe(extended);
```

`T` is inferred as the whole object type, extra properties and all, and the function is allowed to return it as `T`
without losing anything. That is why a constraint is a requirement rather than an assignment: the caller keeps the
narrower type, which is what makes `satisfies`-style helpers usable.

```ts
function withId<T extends object>(value: T): T & { id: string } {
  return { ...value, id: crypto.randomUUID() };
}

const row = withId({ key: 'a' });
```

`row` is `{ key: string } & { id: string }`, so `row.key` and `row.id` are both known. A return type of
`{ key: string; id: string }` would have widened the result and lost any other property.

## Constraining a constructor

```ts
function create<T>(ctor: new () => T): T {
  return new ctor();
}

const store = create(RowStore);
```

`new () => T` constrains the argument to a class with a no-argument constructor, and `T` is inferred as the instance
type. That is how a container or a factory is typed, and the construct signature can take parameters as well:

```ts
function create<T>(ctor: new (name: string) => T, name: string): T {
  return new ctor(name);
}
```

## A constraint with a default

```ts
type Paged<T, K extends keyof T = keyof T> = {
  items: T[];
  sort: K;
};
```

A default makes the second parameter optional, so `Paged<Row>` is `Paged<Row, keyof Row>` and a caller that cares can
write `Paged<Row, 'key'>`. Defaults on type parameters are the subject of the lesson after next, and they are the reason
a generic type can be usable without being written out fully at every use.

## Where a constraint hurts

```ts
function count<T extends { length: number }>(values: T[]): number {
  return values.length;
}
```

That signature is more restrictive than the function needs. The body reads the length of the array, and the constraint on
the element type is doing nothing, so a caller with a `number[]` is told they need a width they do not have. A
constraint added for a body that barely uses it makes the function harder to call, and the check worth doing is whether
the requirement is on the input or on the output:

- A requirement on the input belongs in the parameter type, not in a constraint.
- A requirement on the output belongs in the return type, and `T[K]` and the conditional types are how it is written.
- A constraint belongs where the body needs to know something about the type it was given, such as that it has a key.

## Check yourself

Write a `get` with `K extends keyof T` and call it with a valid and an invalid key, reading both results. Then write a
function with an intersection constraint and confirm that an object with extra properties is accepted.
