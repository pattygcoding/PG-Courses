---
title: Types for a JavaScript package
summary: Generating declarations from JSDoc, and what to do when a dependency ships no types.
chapter: Types for other people
minutes: 13
status: draft
---

## Let the compiler read the JavaScript

```js
/**
 * @typedef {object} Row
 * @property {string} key
 * @property {number} value
 */

/**
 * Split a text into rows.
 * @param {string} text
 * @param {{ strict?: boolean }} [options]
 * @returns {Row[]}
 */
export function parse(text, options) {
  return text.split(',').map((key) => ({ key, value: 0 }));
}
```

With `allowJs` and `declaration` on, the compiler writes a declaration from that file:

```ts
/**
 * @typedef {object} Row
 * @property {string} key
 * @property {number} value
 */
/**
 * Split a text into rows.
 * @param {string} text
 * @param {{ strict?: boolean }} [options]
 * @returns {Row[]}
 */
export function parse(text: string, options?: {
    strict?: boolean;
}): Row[];

export type Row = {
    key: string;
    value: number;
};
```

Three things came out of one small file: the JSDoc comments are carried into the declaration, so the consumer sees the
documentation; `@typedef` became an exported `type Row`; and the bracketed `[options]` became an optional parameter. That
is the workflow for a package that has to ship JavaScript and wants to ship types with it.

```json
{
  "compilerOptions": {
    "allowJs": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

`emitDeclarationOnly` is the key: the package ships the `.js` it already had plus a `.d.ts` generated from it, and
nothing else changes. Adding `checkJs` makes the compiler check the file too, which is how a JavaScript package gets the
benefit of the type system without a rewrite.

## The JSDoc tags worth knowing

```js
/**
 * @param {string} text
 * @param {{ strict?: boolean }} [options]
 * @returns {Row[]}
 */

/** @type {ReadonlyArray<string>} */
export const LEVELS = ['quiet', 'loud'];

/** @type {import('./row.js').Row} */
let current;
```

`@param` and `@returns` are the two that matter, `@type` annotates a variable, and `import('./row.js').Row` refers to a
type in another module without an import statement. That last form is how a JavaScript file uses a type it cannot import,
and it is the reason a `.js` file can be typed against a `.ts` one.

```js
/**
 * @template T
 * @param {T[]} items
 * @returns {T | undefined}
 */
export function first(items) {
  return items[0];
}
```

`@template` declares a type parameter, which is the JSDoc equivalent of `<T>`. It works and it is noticeably harder to
read than the TypeScript version, which is the honest argument for a rename when a file needs much of it.

## A dependency with no types

```ts
declare module 'untyped-thing' {
  export function doSomething(value: string): void;

  export interface ThingOptions {
    retries?: number;
  }
}
```

Put that in a file the project includes and the import resolves with the shapes declared. That is the three line fix for
a dependency that never shipped types, and it is better than an `any` at every call site because it fails to compile if the
API changes shape.

The risk is the same one from the previous lesson: nothing checks the declaration against the package, so a hand-written
declaration drifts. A test that calls the package through the declared types catches a rename and does not catch a wrong
type.

```ts
import { doSomething } from 'untyped-thing';

doSomething('a');
```

## A local module that is not in the package graph

```json
{
  "compilerOptions": {
    "paths": {
      "@generated/*": ["./types/generated/*"]
    }
  }
}
```

`paths` plus a `types` directory is how a build artefact that only exists at compile time is typed: a generated client, a
codegen output, or a virtual module from a bundler plugin. The runtime side has to be arranged separately, as the modules
lesson said.

## Where a hand-written declaration belongs

| Situation | Where the file goes |
| --- | --- |
| A package with no types | `types/<package>.d.ts`, included by the project |
| A local JavaScript module | `<name>.d.ts` beside `<name>.js` |
| A global injected by a bundler | `types/globals.d.ts` |
| An augmentation of a library | `types/<library>.d.ts`, with an import inside |
| A generated client | not written by hand at all |

The last row is the one to think about: a generated client should generate its types as well, because a hand-written
declaration for generated code is guaranteed to drift on the next generation.

## Check yourself

Take a small JavaScript file and run the compiler over it with `declaration` and `emitDeclarationOnly`, then read the
declaration and compare it with the JSDoc. Then add a `@template` tag and see what the declaration contains.
