---
title: Catching breaking changes
summary: The compiler as a checklist of every call site, and the changes it cannot see.
chapter: Testing and quality
minutes: 12
status: draft
---

## The compiler names every call site

```ts
type Row = { key: string; value: string };
```

```ts
type Row = { key: string; value: number };
```

Changing that property from a string to a number is a one-line edit that breaks every place a row is built and every place
`value` is used as a string. The compiler reports each one:

```text
error TS2322: Type 'string' is not assignable to type 'number'.
```

The value of that is easy to underestimate. Without the checker the same change is a search for `value` and a decision
about each result, and the ones that are wrong appear at run time. With it, the change is a list, and the list is complete
because it includes the paths a test does not exercise.

That property, a change to a type producing a list of the places to fix, is the reason the earlier lessons argue for
deriving types rather than duplicating them. A duplicated shape has to be changed in two places and the compiler only
knows about one.

## A rename is a compiler-driven refactor

Renaming a property is the same mechanism: the edit produces errors at every use, and the errors are the work list. An
editor's rename function uses the same information and does the edit for you, which is why go-to-definition and find-all-
references are worth trusting in a well typed codebase and worth double-checking in one that is full of `any`.

The case where the compiler does not help is a rename that changes only a string:

```ts
const key = 'rowValue';
```

A string used as a key is invisible until it is typed as a literal or constrained by a `keyof`. That is the argument for
the `Record<Level, ...>` and `keyof T` patterns from the composing types chapter, and the reason a configuration key
deserves a type.

## Deprecating rather than removing

```ts
/**
 * @deprecated use parseRows instead
 */
export function parse(text: string): Row[] { }
```

A `@deprecated` tag is shown by the editor as a strike-through on the call site and the message appears in the hover,
which tells a consumer what to use instead without breaking their build. That is the mechanism for a two-step change:

1. Add the new function and mark the old one deprecated.
2. Remove the old one in the next major version.

The alternative, removing the old one in the same release, means every consumer's build fails on upgrade with no
intermediate state. The two-step version costs a release cycle and it is what a library that people depend on does.

## Pinning the shape in a test

```ts
import { expectTypeOf, test } from 'vitest';

test('the declaration has not changed shape', () => {
  expectTypeOf(parse).parameter(0).toBeString();
  expectTypeOf(parse).returns.toEqualTypeOf<Row[]>();
});
```

Those assertions fail when a signature changes, which turns an accidental breaking change into a test failure. The check
is narrower than the compiler's own: it pins the parts of the API the library promises, and a change to the body of a
function with the same signature passes, which is what makes it a specification rather than an accident detector.

For a library with a large surface, comparing the emitted `.d.ts` against a committed copy is the more complete version:

```bash
npx tsc --emitDeclarationOnly --outDir dist
git diff --exit-code -- dist/types
```

A diff in that directory is a change to the public API, and reviewing it in a pull request is the cheapest way to notice a
change nobody intended. The cost is a generated file in version control that has to be regenerated on every change, which
is a real maintenance burden and the reason most projects use a tool that reports the difference instead.

## The changes a test cannot see

| Change | Visible to the compiler |
| --- | --- |
| A property's type changed | yes, at every use |
| A property renamed | yes, at every use |
| A function's parameter added | yes, at every call |
| A union member removed | yes, at every switch |
| A default value changed | no |
| A function's behaviour changed | no |
| A field that used to be sorted is not | no |
| A success status became an error status | no |

The bottom half is the reason a type check is not a test suite, and the reason the value tests beside the type tests matter.
A signature describes the shape of a call and a return; it says nothing about what the function does with them.

## The reviewing habit

A pull request that changes a shared type deserves its own review, because the diff is small and the effect is large. The
things worth checking:

- Are the errors it produces fixed by changing a call site, or by widening the type? The second is usually a mistake, and
  it is how a change that should have been a refactor becomes an `any`.
- Does the change make a wrong state representable? Adding an optional property to a type that was a discriminated union
  is the usual shape of that mistake.
- Is the change to an exported type from a published package a breaking one? Then the version needs to say so, whatever
  the JavaScript did.

## Check yourself

Change a property's type in a shared type and count the compile errors it produces. Fix them by changing the values rather
than by widening the type, then mark a function `@deprecated` and read the hover in the editor.
