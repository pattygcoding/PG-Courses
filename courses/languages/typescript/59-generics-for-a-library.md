---
title: Generics for a library
summary: Designing a signature a consumer can use without reading it, and the tests that keep it honest.
chapter: Working with the ecosystem
minutes: 13
status: draft
---

## The consumer cannot see your intent

```ts
function createStore<T, K extends keyof T, O extends StoreOptions>(initial: T, key: K, options: O): Store<T, K, O> { }
```

That signature is precise and a consumer has to read it three times to call the function. The precision is real and the
cost is real, and for a library the cost is paid by everyone who uses it.

The version to aim for is one the consumer can call without thinking:

```ts
function createStore<T>(initial: T, options?: StoreOptions): Store<T> { }
```

Inference fills in `T` from the first argument, the options have a default, and the return type is named. Nothing is lost
that a caller needs, and the signature fits on a line.

## Inference in both directions

```ts
function select<T, U>(items: readonly T[], map: (item: T) => U): U[] {
  return items.map(map);
}
```

`T` comes from the array and `U` from the callback's return, so both are inferred and neither is written:

```ts
const keys = select(rows, (row) => row.key);
```

`keys` is `string[]`. That shape, a type parameter per direction, is what a consumer expects from a collection helper, and
it is why the standard library's array methods read the way they do.

Where a parameter has no argument to infer from, a default is the tool:

```ts
function list<T = string>(items: T[] = []): T[] {
  return items;
}
```

`list()` is `string[]`, because the default filled in what inference could not. A default is a fallback rather than a
constraint, as the defaults lesson said, so it cannot be used to force a type.

## The `this` type for a chain

```ts
class Query {
  where(clause: string): this {
    return this;
  }

  limit(count: number): this {
    return this;
  }
}
```

Returning `this` rather than the class name keeps the most derived type through a chain, which is what a builder needs and
what a subclass loses if the methods return the base type. The same applies to an interface:

```ts
interface Builder<T> {
  with<K extends keyof T>(key: K, value: T[K]): this;
  build(): T;
}
```

`this` in an interface is the type of the implementer, so each method returns the concrete builder and the chain keeps
working after a subclass adds a method. That is the signature a library should use for anything fluent.

## A constrained key belongs in the parameter

```ts
function groupBy<T, K extends keyof T>(items: readonly T[], key: K): Map<T[K], T[]> { }
```

`K extends keyof T` is the pattern worth copying into a library: the caller passes a property name as a literal, the
return type is keyed by that property's type, and a name that is not in the object is a compile error at the call site
with the list of valid names in the message. It is the single most useful generic signature in this course.

```ts
const byLevel = groupBy(rows, 'level');
```

`byLevel` is `Map<Level, Row[]>`, inferred from the property the caller named. Nothing is annotated and the editor's
autocomplete offers the property names.

## Where a library should not be generic

- **A function with one implementation.** A generic that saves no duplication is a type parameter a consumer has to
  supply or understand. A concrete type with a `Partial` parameter is easier to call.
- **An options object.** A generic options object forces the caller to spell out the type or accept the inferred one,
  which is usually not what the library intended. A named interface with optional members is clearer.
- **A return type that depends on a runtime value.** A type that changes with a value inside the function is a claim the
  compiler cannot check, and an overload that describes the two cases is more honest.
- **A parameter used once.** The rule from the first generics lesson applies with more force in a library, because the
  cost is multiplied by the number of consumers.

## Test the inference, not the types

```ts
test('the return type follows the property name', () => {
  const byLevel = groupBy(rows, 'level');

  expect(byLevel.get('quiet')).toHaveLength(1);
  expectTypeOf(byLevel).toEqualTypeOf<Map<Level, Row[]>>();
});
```

A library's signature is its API, and the part of it that is easiest to break by accident is the inference. A type test
pins it, and the failure message names the expected and actual type, which is the most readable failure in the toolchain.

The other half is a declaration test: a file outside the package's source that imports it by name and uses it as a consumer
would. That is the only check that catches a type that did not make it into the emitted declaration, and for a library it is
worth the extra directory.

## Check yourself

Design a `groupBy`-style signature with a constrained key and call it with a valid and an invalid property name, reading
both results. Then decide which of its type parameters a consumer would have to write out and remove the ones they would
not.
