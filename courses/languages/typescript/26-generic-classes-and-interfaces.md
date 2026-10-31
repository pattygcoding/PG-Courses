---
title: Generic classes and interfaces
summary: A type parameter on a class, the static member that cannot use it, and at run time what is left.
chapter: Generics
minutes: 12
status: draft
---

## A class can take a type parameter

```ts
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  get size(): number {
    return this.items.length;
  }
}

const numbers = new Stack<number>();

numbers.push(1);
numbers.push('a');
```

```text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

The parameter is part of the class's type rather than of one method, so every member can use it and the compiler checks
the whole instance against the argument given to `new`. Inference does not work here the way it does for a function:

```ts
const inferred = new Stack();
```

`inferred` is `Stack<unknown>`, because there is no argument from which to infer `T`. Where a class is constructed
with its first value, a static factory can infer instead:

```ts
class Stack<T> {
  static of<T>(first: T): Stack<T> {
    const stack = new Stack<T>();

    stack.push(first);

    return stack;
  }
}

const stack = Stack.of('a');
```

That is the pattern for a collection-like class, and it is why `new Map([['a', 1]])` works with a type argument inferred
from an array of pairs.

## A static member cannot use the class parameter

```ts
class Stack<T> {
  static empty(): Stack<T> {
    return new Stack<T>();
  }
}
```

```text
error TS2302: Static members cannot reference class type parameters.
```

A static member belongs to the constructor rather than to an instance, and there is no instance type to substitute. The
fix is to make the static member generic in its own right, which is what the `of` factory above does.

## Constraints work the same way

```ts
class Registry<T extends { id: string }> {
  private items = new Map<string, T>();

  add(item: T): void {
    this.items.set(item.id, item);
  }
}
```

`T extends { id: string }` means every item has an id, so the body can use it. The constraint is checked when the class
is used, and a subclass has to satisfy it too:

```ts
class RowRegistry extends Registry<Row> { }
```

## A generic interface

```ts
interface Store<T> {
  find(key: string): Promise<T | undefined>;
  save(value: T): Promise<void>;
}

class RowStore implements Store<Row> {
  async find(key: string): Promise<Row | undefined> { }
  async save(value: Row): Promise<void> { }
}
```

An implementation picks the type argument, which is how one interface covers a dozen classes. A class can also leave the
parameter open and propagate it:

```ts
class CachedStore<T> implements Store<T> {
  constructor(private readonly inner: Store<T>) { }

  async find(key: string): Promise<T | undefined> {
    return this.inner.find(key);
  }

  async save(value: T): Promise<void> {
    await this.inner.save(value);
  }
}
```

That is a decorator, and it is a good example of where a generic class earns its place: the wrapper knows nothing about
the type it holds and passes it through unchanged.

## A generic method on a plain class

```ts
class Sink {
  write<T>(value: T): void {
    console.log(JSON.stringify(value));
  }
}

new Sink().write({ key: 'a' });
```

A method can have its own type parameter, independent of the class, which is how a method that transforms whatever it is
given works inside a class that has nothing to do with that type. The two are different parameters: one is fixed at
`new`, the other at the call.

## What is left at run time

```ts
const stack = new Stack<number>();

console.log(stack instanceof Stack);
```

```text
true
```

The class is there because it is a value; the type argument is erased. There is no `Stack<number>` at run time, no way to
check a type argument, and no way to construct a `T`. A class that needs to build a `T` takes a factory:

```ts
class Pool<T> {
  constructor(private readonly create: () => T) { }
}
```

That is the same workaround as the generic function lesson, and it is the honest cost of erasure.

## Check yourself

Write a generic `Stack` with a `push` and a `pop`, use it with two element types, and try to push the wrong one. Add a
static member that uses the type parameter and read the error, then fix it with a generic static factory.
