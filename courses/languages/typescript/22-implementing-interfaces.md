---
title: Implementing interfaces
summary: The contract on the class, the difference between a class and its instances, and the pattern that separates them.
chapter: Classes and values
minutes: 12
status: draft
---

## A class implements a shape

```ts
interface RowStore {
  find(key: string): Promise<Row | undefined>;
  save(row: Row): Promise<void>;
}

class JdbcRowStore implements RowStore {
  async find(key: string): Promise<Row | undefined> {
    return this.query(key);
  }

  async save(row: Row): Promise<void> {
    await this.insert(row);
  }
}
```

`implements` takes an interface or a type alias of an object type, and it checks that the class has every member with a
compatible type. It adds nothing to the class and it does not create a subtype relationship the way `extends` does.

```ts
class Incomplete implements RowStore {
  async find(key: string): Promise<Row | undefined> {
    return undefined;
  }
}
```

```text
error TS2420: Class 'Incomplete' incorrectly implements interface 'RowStore'.
  Property 'save' is missing in type 'Incomplete' but required in type 'RowStore'.
```

The message names the missing member, which makes it the useful kind. The same check covers a member of the wrong type,
with a nested explanation of why.

## A class can implement several contracts

```ts
class RowStore implements Readable, Writable {
  async find(key: string): Promise<Row | undefined> { }
  async save(row: Row): Promise<void> { }
}
```

A class implements any number of interfaces, which is the advantage over extending a base class: the class picks up
several contracts without a hierarchy. The cost is that it inherits nothing, so two implementations that share code need
a base class as well as the interfaces.

## implements is documentation with a check

```ts
class JdbcRowStore implements RowStore { }

const store: RowStore = new JdbcRowStore();
const alsoStore: RowStore = {
  find: async () => undefined,
  save: async () => {},
};
```

The object literal is accepted, because the interface is a shape and the class is one way to build it. That is why
`implements` is worth writing anyway: it makes the compiler report the missing member at the class rather than at the
call site that happens to need it, and it documents the intent.

The class instance type and the class itself are two different types:

| Expression | Means |
| --- | --- |
| `RowStore` | the interface, what an instance looks like |
| `JdbcRowStore` | what an instance of the class looks like |
| `typeof JdbcRowStore` | the constructor, what `new` accepts |

```ts
function create(ctor: new () => RowStore): RowStore {
  return new ctor();
}

create(JdbcRowStore);
```

A parameter typed `new () => RowStore` accepts any class whose constructor takes no arguments and whose instances satisfy
the interface, which is how a factory or a container takes a class rather than an instance. The constructor signature is
part of the check, so a class that needs arguments does not fit:

```text
error TS2345: Argument of type 'typeof JdbcRowStore' is not assignable to parameter of type 'new () => RowStore'.
  Types of construct signatures are incompatible.
```

The fix is to widen the construct signature to the arguments the class needs, or to take an instance where the factory
currently takes a class.

## A class with a private member cannot be implemented

```ts
class Base {
  private secret = 1;
}

class Other extends Base implements Base { }
```

A type with a private member cannot be satisfied structurally, because no other class can have that private field. That
is the one place TypeScript behaves nominally: the private member makes the type name-only. An interface cannot have a
`private` member at all, which is why a contract that includes one has to be an abstract class instead.

```ts
abstract class Base {
  abstract find(key: string): Promise<Row | undefined>;
}
```

An abstract class is the tool for a contract that also needs state or a protected hook, and an interface is the tool for
a contract that is only a set of methods. That is the same comparison as the one in the interfaces lesson, seen from the
class side.

## The pattern worth following

```ts
export interface RowStore {
  find(key: string): Promise<Row | undefined>;
}

export class JdbcRowStore implements RowStore { }

export function createRowStore(url: string): RowStore {
  return new JdbcRowStore(url);
}
```

A consumer imports the interface and the factory, and never the class. That means the implementation can be replaced,
the test can pass an object literal that satisfies the interface, and the class cannot grow a public member without the
interface being updated first. It is the shape I use for anything with more than one implementation, and it is the
subject of the dependency injection lesson later.

## Check yourself

Write an interface with two methods, a class that implements it and a class that implements one method, and read the
error from the second. Then write a factory taking `new () => TheInterface` and pass the class to it.
