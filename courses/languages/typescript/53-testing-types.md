---
title: Testing types
summary: Assertions the compiler checks, the runner that ignores them, and the error a failure produces.
chapter: Testing and quality
minutes: 13
status: draft
---

## A type test is a check by the compiler

```ts
import { expect, expectTypeOf, test } from 'vitest';

function firstOf<T>(items: readonly T[]): T | undefined {
  return items[0];
}

test('the inferred types are what the signature promises', () => {
  expect(firstOf([1, 2])).toBe(1);
  expectTypeOf(firstOf([1, 2])).toEqualTypeOf<number | undefined>();
  expectTypeOf(firstOf(['a'])).toEqualTypeOf<string | undefined>();
});
```

`expectTypeOf` comes from Vitest, so the type assertions live beside the value assertions in the same file. The important
part is what happens when one is wrong:

```ts
expectTypeOf(firstOf([1, 2])).toEqualTypeOf<string>();
```

The test runner passes, because `expectTypeOf` does nothing at run time:

```text
Test Files  1 passed (1)
     Tests  2 passed (2)
```

The compiler fails, because that is where the assertion is evaluated:

```text
error TS2344: Type 'string' does not satisfy the constraint '"Expected: string, Actual: number" | "Expected: string, Actual: undefined"'.
```

The message states the expected and the actual type, which is the clearest failure message in the whole toolchain. It also
means the assertion only catches anything if `tsc --noEmit` runs in continuous integration, which is the point of the next
few lessons: a type test in a repository whose build does not type check the tests is decoration.

## The assertions worth knowing

```ts
expectTypeOf(value).toEqualTypeOf<Row>();
expectTypeOf(value).toMatchTypeOf<{ key: string }>();
expectTypeOf(value).toHaveProperty('key');
expectTypeOf<Row>().not.toHaveProperty('missing');
expectTypeOf(fn).parameter(0).toBeString();
expectTypeOf(fn).returns.toBeNumber();
expectTypeOf(promise).resolves.toEqualTypeOf<Row[]>();
```

`toEqualTypeOf` is exact equality and `toMatchTypeOf` is assignability, which is the difference that matters most: a `Row`
matches `{ key: string }` and does not equal it. `toHaveProperty`, `parameter` and `returns` reach into a shape, and
`.resolves` unwraps a promise. That set covers most of what a type test needs.

## Where a type test earns its place

- **A generic function's inference.** The whole point of `firstOf` is that the return type follows the argument, and a
  value assertion cannot check that. This is the case that justifies the machinery.
- **A mapped or conditional type.** A utility type with a subtle behaviour is exactly what a test should pin down, and the
  failure message names the difference.
- **A declaration file for a dependency.** A test that imports the package by name and uses it as the declaration claims is
  the only thing that catches drift, which is the publishing lesson's `test-d` directory.
- **A type that is meant to reject something.** A union with a member removed, a brand, a constraint: the interesting
  property is that a bad value does not compile, and that needs `@ts-expect-error`.

## Testing what does not compile

```ts
// @ts-expect-error a plain string is not a UserId
const id: UserId = 'usr_123';

// @ts-expect-error the union has no message property
const text = error.message;
```

`@ts-expect-error` asserts that the next line is an error, and an unused directive is itself an error. That is the whole
mechanism: if the code starts compiling, the test fails, which is how a property the type system checks stays checked.

```text
error TS2578: Unused '@ts-expect-error' directive.
```

That message is what a passing `@ts-expect-error` looks like when the reason for it disappears, and it is why this is
strictly better than `@ts-ignore`, which suppresses quietly for ever.

## A typed fake is a test double

```ts
const store: RowStore = {
  find: async () => ({ key: 'a', value: 1 }),
  save: async () => { },
};
```

The interface from the dependency injection lesson is what makes a test double cheap: an object literal that satisfies the
type is a complete replacement, and the compiler checks it. A test cannot pass a fake with a missing method or a method of
the wrong shape, which removes the class of test bug where the double and the real thing disagree.

```ts
function fakeStore(overrides: Partial<RowStore> = {}): RowStore {
  return {
    find: async () => undefined,
    save: async () => { },
    ...overrides,
  };
}
```

That helper is the pattern to write once per dependency. It keeps the full contract in one place, and a change to the
interface is a single compile error rather than one per test.

## What a type test does not do

It does not exercise a branch, it does not catch a wrong implementation, and it does not check that a value has the shape
its type claims at run time. A function typed `(input: string): Row[]` that returns an empty array for every input passes
every type test in this lesson, and it is exactly the case the boundary lesson is about.

The division of labour: a value test checks that the code does what it should, a type test checks that the signature says
what it means, and a schema check at the boundary keeps the two honest about data from outside.

## Check yourself

Write a generic function and a type test for its inference, then break the assertion and confirm the test runner still
passes while the type check fails. Then add a `@ts-expect-error` for a case that should not compile and remove the reason
for it to see the unused-directive error.
