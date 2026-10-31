---
title: Branded types
summary: Making two strings different types, and the ceremony that costs.
chapter: Modelling
minutes: 12
status: draft
---

## Two ids are the same type

```ts
function loadUser(id: string): Promise<User> { }
function loadOrder(id: string): Promise<Order> { }

const orderId = 'ord_123';

loadUser(orderId);
```

That compiles and it is a bug the type system should catch: both ids are strings, so every string is both. The type
system has no way to tell one identifier from another until a type is created that only one of them can have.

## A brand is a property nothing can produce

```ts
declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
```

`unique symbol` is a type only a `declare const` can have, so no value can be created with that property by accident.
`Brand<string, 'UserId'>` is a string with a phantom property, which means a plain string is not assignable to it:

```ts
const id: UserId = 'usr_123';
```

```text
error TS2322: Type 'string' is not assignable to type 'UserId'.
  Type 'string' is not assignable to type '{ readonly [brand]: "UserId"; }'.
```

The error names the brand, which is what makes the mistake readable. The value is a string at run time and the brand
exists only in the type.

## A constructor creates the brand

```ts
function userId(value: string): UserId {
  if (!value.startsWith('usr_')) {
    throw new TypeError(`not a user id: ${value}`);
  }

  return value as UserId;
}

const id = userId('usr_123');
```

That `as` is the only one in the file and it is where the validation happens, which is the point: the assertion is in one
function that checks, rather than at every call site that hopes. The function is the boundary between an unchecked string
and a value the rest of the program can trust.

```ts
const bad = userId('ord_123');
```

```text
TypeError: not a user id: ord_123
```

The failure is at run time and it happens once, at the boundary, rather than somewhere later where the id is used as an
argument of the wrong kind.

## The two functions are no longer interchangeable

```ts
function loadUser(id: UserId): Promise<User> { }
function loadOrder(id: OrderId): Promise<Order> { }

const id = userId('usr_123');

loadOrder(id);
```

```text
error TS2345: Argument of type 'UserId' is not assignable to parameter of type 'OrderId'.
  Type 'UserId' is not assignable to type '{ readonly [brand]: "OrderId"; }'.
```

That is the check the plain string could not give. The cost is that every id has to pass through a constructor, which
means the boundary where ids arrive has to be identified: a request body, a database row, a configuration value.

## A brand can carry a number too

```ts
type Milliseconds = Brand<number, 'Milliseconds'>;
type Seconds = Brand<number, 'Seconds'>;

function delay(ms: Milliseconds): Promise<void> { }
function timeout(s: Seconds): Promise<void> { }
```

That pair is where a brand earns its cost most clearly, because the mistake of passing seconds where milliseconds are
expected is common, silent, and found in production. The constructor is three lines:

```ts
function seconds(value: number): Seconds {
  return value as Seconds;
}
```

A brand with a conversion is worth more than an id, because the two units are the same underlying number and the compiler
otherwise has nothing to work with.

## The other way to get a nominal type

```ts
class UserId {
  private constructor(public readonly value: string) { }

  static parse(value: string): UserId {
    if (!value.startsWith('usr_')) {
      throw new TypeError(`not a user id: ${value}`);
    }

    return new UserId(value);
  }
}
```

A class with a private member is nominal for the same reason the branded type is: no other type can have that private
field, so nothing structural satisfies it. That is the one place TypeScript's assignability is by name rather than by
shape, and it is covered in the classes lesson.

The class version survives into the JavaScript, so it is a real value with a `value` property, and a `WeakMap` or a
serialisation step is needed to get the string back out. The branded type is erased, so it is a string throughout and
costs nothing. My choice: a brand for an id that crosses a boundary, a class for a value with behaviour.

## Where a brand is not worth it

- **One id in a program.** The brand protects against a mistake that cannot be made.
- **A value already wrapped in a class with behaviour.** The class is already nominal.
- **A domain where two ids are never both in scope.** The ceremony buys nothing if the mistake is not possible.
- **A codebase that will not enforce the constructor.** A brand with an `as` at every call site is worse than a plain
  string, because the assertion is now a habit rather than a check.

The test is whether a plausible mistake exists and whether the constructor can be the only way to get the type. Where both
hold, the brand is the cheapest correctness improvement available. Where the second does not, the brand is decoration.

## Check yourself

Write a branded `UserId` and a branded `OrderId` with constructors that validate a prefix, then pass one where the other
is expected and read the error. Finally convert the same thing to a class with a private field and compare the two
approaches at a call site.
