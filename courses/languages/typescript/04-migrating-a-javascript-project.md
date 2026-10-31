---
title: Migrating a JavaScript project
summary: Turning the checker on for one file at a time, and the order that keeps the error count manageable.
chapter: Getting started
minutes: 13
status: draft
---

## Start by letting the compiler read JavaScript

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": false
  },
  "include": ["src"]
}
```

`allowJs` lets the compiler read `.js` files, and `checkJs` checks them. With both on, a whole JavaScript project is
under the checker with no file renamed, which is the cheapest way to find out how much work is ahead.

Turning `checkJs` on for the whole project at once produces hundreds of errors, which is why the next step is to scope
it. In TypeScript, a `.js` file is opt-in with a comment:

```js
// @ts-check

export function total(rows) {
  return rows.reduce((sum, row) => sum + row.value, 0);
}
```

```text
error TS7006: Parameter 'rows' implicitly has an 'any' type.
error TS7006: Parameter 'sum' implicitly has an 'any' type.
error TS7006: Parameter 'row' implicitly has an 'any' type.
```

The comment is the smallest unit of adoption: one file, the errors it has today, and the rest of the project unchanged.

## Annotate through JSDoc, or rename the file

```js
// @ts-check

/**
 * @param {{ key: string, value: number }[]} rows
 * @returns {number}
 */
export function total(rows) {
  return rows.reduce((sum, row) => sum + row.value, 0);
}
```

JSDoc comments carry the types without changing the runtime file, and they work in a `.js` file for a project that
cannot rename things. The alternative is the rename, which is what most projects do:

```ts
export function total(rows: { key: string; value: number }[]): number {
  return rows.reduce((sum, row) => sum + row.value, 0);
}
```

Renaming a file to `.ts` and fixing its errors is one commit per file, and it is the version that ends up readable. The
JSDoc route is for a package that has to ship JavaScript as its artefact.

## The order to turn strictness on

1. `allowJs` and `checkJs` on one directory.
2. Rename the files in that directory to `.ts` and fix the errors.
3. Add `noImplicitAny` for the whole project. Most of the errors are untyped parameters.
4. Add `strictNullChecks` on its own. This is the biggest step and the most valuable.
5. Turn on `strict` for everything the other flags bring.
6. Add `noUncheckedIndexedAccess` last, because it is the strictest and the least familiar.

Each step is a separate pull request, because each one is a set of real decisions rather than a reformat. Doing the
whole list at once means a diff nobody can review, and a bug introduced by a type change is the hardest kind to find
afterwards.

## The flags that find real bugs

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

`noUncheckedIndexedAccess` makes an array index and a key of a record return `T | undefined`, because the index might
not exist. It is correct and it adds a check to every array access, which is why it is the last step rather than the
first.

```ts
const rows: string[] = [];
const first = rows[0];       // string | undefined with the flag, string without
```

`exactOptionalPropertyTypes` distinguishes a property that is absent from one that is present and `undefined`, which
matters when the difference is meaningful. `noImplicitOverride` requires the `override` keyword on a method that
replaces a base one, which catches a rename in the base class that silently stopped overriding.

## any, unknown and the two comment escapes

```ts
function load(input: any) {
  return input.rows.map((row: any) => row.key);
}
```

`any` switches the checker off for that value and for everything computed from it, which is why it spreads. The
replacement is `unknown`, which accepts any value and requires a check before use:

```ts
function load(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('expected an object');
  }

  return input;
}
```

```ts
// @ts-expect-error the library types are wrong here
library.call(data, 'name');

// @ts-ignore
library.call(data, 'name');
```

`@ts-expect-error` fails when the error stops happening, so the suppression removes itself from the codebase once it is
not needed. `@ts-ignore` suppresses silently for ever. Use the first one, and put the reason on the same line.

## Check what the migration produced

A migration is a change to a program that is not supposed to change its behaviour, and the only evidence for that is
the test suite. Two habits matter:

- Run the tests after each file, not after the whole directory.
- Be suspicious of an `as` added to make an error go away. An assertion tells the compiler what the value is without
  checking, so it moves the failure to run time, which is where it was before.

```ts
const row = JSON.parse(text) as Row;      // a promise the compiler cannot keep
```

The honest version validates and converts, which is what the chapter on types at the boundary covers.

## Check yourself

Add `checkJs` with a `// @ts-check` comment to one JavaScript file and read the errors without changing anything else.
Fix them with JSDoc, then rename the file to `.ts` and fix them again with annotations. Compare the two versions of the
file.
