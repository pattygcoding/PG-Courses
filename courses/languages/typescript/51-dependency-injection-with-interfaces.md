---
title: Dependency injection with interfaces
summary: Contracts as types, wiring as a function, and the test that needs no framework.
chapter: Modelling
minutes: 12
status: draft
---

## A contract is an interface, the implementation is a class

```ts
export interface RowStore {
  find(key: string): Promise<Row | undefined>;
  save(row: Row): Promise<void>;
}

export class JdbcRowStore implements RowStore {
  constructor(private readonly url: string) { }

  async find(key: string): Promise<Row | undefined> {
    return this.query(key);
  }

  async save(row: Row): Promise<void> {
    await this.insert(row);
  }
}
```

A consumer depends on the interface and never on the class, which is what makes a replacement possible. The consumer's
constructor takes the interface:

```ts
export class ReportService {
  constructor(private readonly store: RowStore) { }

  async total(key: string): Promise<number> {
    const row = await this.store.find(key);

    return row?.value ?? 0;
  }
}
```

`ReportService` cannot see `JdbcRowStore`, `query` or `insert`, so a change to the database layer cannot reach through it.
That is the property, and TypeScript enforces it with a single keyword.

## The test needs no framework

```ts
const store: RowStore = {
  find: async () => ({ key: 'a', value: 1 }),
  save: async () => { },
};

const service = new ReportService(store);
```

That is the whole test double: an object literal that satisfies the interface. No mocking library, no injection container,
and a method that is not needed by the test is still present because the interface requires it. Where the interface has
eight methods and the test needs one, a helper that fills the rest is worth having:

```ts
function fakeStore(overrides: Partial<RowStore> = {}): RowStore {
  return {
    find: async () => undefined,
    save: async () => { },
    ...overrides,
  };
}
```

`Partial<RowStore>` lets a test supply only what it cares about, and the helper is the one place that knows the full
contract. That combination, an interface plus a `fakeX` helper, is the pattern I use for every injected dependency.

## Wiring is a function

```ts
export function createReportService(url: string): ReportService {
  return new ReportService(new JdbcRowStore(url));
}
```

The composition happens in one place, which is the only place that knows which implementation is used. A test calls the
service constructor directly with a fake, and the application calls the factory. Nothing needs a container to find the
implementation.

```ts
export function createApp(deps: { store: RowStore; clock: Clock }): App { }
```

An app factory that takes its dependencies as an object is the version I prefer at the top level: it makes the full set of
dependencies visible in one signature, and the wiring is a function that reads as a list of what the application needs.

## A container is a record of factories

```ts
const container = {
  store: () => new JdbcRowStore(config.url),
  clock: () => new SystemClock(),
} satisfies Record<string, () => unknown>;

type Container = { [K in keyof typeof container]: ReturnType<typeof container[K]> };
```

`ReturnType<typeof container[K]>` is the type each factory produces, so `Container['store']` is `RowStore` if the factory
returns one. That is a container expressed in about four lines, with no runtime lookup, and adding a dependency is adding a
line rather than registering anything.

```ts
function resolve<K extends keyof Container>(key: K): Container[K] {
  return container[key]() as Container[K];
}
```

The cast is needed because the compiler cannot relate the factory's return type to the key in a `Record` of functions. That
is the same one-line limitation as the event emitter in the generics chapter, and it is the price of a container without a
library.

The reason to prefer this to a framework is that a framework's container resolves by string or by decorator metadata at
run time, which means a missing registration is a runtime error and the types are either absent or inferred from
decorators. A record of factories is checked at compile time and reads as ordinary code.

## Constructors, parameters or a context

| Style | Test cost | Readability |
| --- | --- | --- |
| Constructor injection | a fake per dependency, short | explicit dependencies |
| A parameters object | shorter, one object | explicit, fewer positions |
| A framework container | the framework in every test | hidden dependencies |
| Module-level singletons | the module must be replaced | hidden dependencies, everywhere |

The last row is the one to watch for in a codebase: a module that imports a database client directly and uses it inside a
function cannot be tested without replacing the module, and the replacement depends on the module system. A single exported
`const db` at the top of a module is cheap to write and it is the decision that makes the module untestable.

## Where an interface is not needed

```ts
export class ReportService {
  constructor(private readonly store: RowStore) { }
}
```

One implementation and no test double is a case for taking the class: an interface with one implementation and no fakes is
a second name to keep in step, and `RowStore` in a codebase with one store is ceremony. The rule I use is that an interface
appears when the second implementation exists, which is either a test double or a real alternative.

Since a test double usually appears early, that rule arrives at the interface quickly. The version to avoid is the interface
written before either one exists, with a single class that implements it and nothing else referencing the type.

## Check yourself

Take a class that constructs its own dependency inside a method and move the dependency to the constructor with an
interface type. Then write a test that passes an object literal and delete whatever mocking setup the old test needed.
