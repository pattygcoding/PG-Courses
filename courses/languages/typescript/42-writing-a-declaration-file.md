---
title: Writing a declaration file
summary: Types for code the compiler cannot see, and the fact that nothing checks them against the implementation.
chapter: Types for other people
minutes: 13
status: draft
---

## A declaration is a type with no body

```ts
export interface Row {
  key: string;
  value: number;
}

export declare function parse(text: string): Row[];

export declare class Store {
  constructor(name: string);
  readonly name: string;
}
```

A `.d.ts` file describes the shapes of things that exist elsewhere. `declare` marks a value that is not implemented here,
and an interface or a type alias needs no marker because it has no runtime part to implement. Nothing in a `.d.ts` is
executed, so it may not contain an initialiser, a function body or a class member with an implementation.

The compiler checks a `.d.ts` for internal consistency and it does not check it against any implementation. A declaration
that says a function takes a string when the code takes a number is accepted, and the mistake surfaces at run time. That
is the single most important thing to know about hand-written declarations, and it is why the test in the last section of
this lesson matters.

## Declaring a module

```ts
declare module 'legacy-parser' {
  export interface Options {
    strict?: boolean;
  }

  export function parse(text: string, options?: Options): unknown[];

  const parser: {
    parse: typeof parse;
  };

  export default parser;
}
```

A module declaration in a `.d.ts` file names a module the compiler cannot otherwise resolve. The shape inside is the
module's exports, written as they would be in the source. Putting that in a file included by the project is the fastest
way to type a dependency that has no types and that nobody has published types for.

The file it lives in needs to be a module for `declare module` to be a module augmentation rather than a global
declaration, which is the trap in the next section. The reliable way to make it a module is to have an
`import` or an `export` at the top level, and a common idiom is an empty one:

```ts
export { };
```

## Global declarations

```ts
declare const VERSION: string;

declare function report(message: string): void;

interface Window {
  theme: string;
}
```

At the top level of a script (a file with no import or export), those declarations are global, which is how a build-time
constant injected by a bundler is typed. `declare const VERSION: string;` says the value exists at run time and the
compiler should believe it, and the definition has to come from somewhere else: a bundler's `define`, a script tag, or a
test setup.

```ts
declare global {
  interface Window {
    theme: string;
  }
}

export { };
```

Inside a module, a `declare global` block reaches the global scope explicitly. That is the form to use in a file that is
already a module, and the empty export at the end is what keeps the file a module if nothing else does.

## CommonJS and UMD shapes

```ts
export = Store;

declare namespace Store {
  interface Options {
    strict: boolean;
  }
}
```

`export =` declares a module that assigns a single value to `module.exports`, which is how a CommonJS package that exports
one thing is typed. A namespace merged with the value adds the types that hang off it, because a `namespace` can hold
interfaces as well as values.

```ts
export as namespace Report;

export function parse(text: string): Row[];
```

`export as namespace` declares that the module also defines a global for a script tag, which is the UMD pattern. It is
legacy and it still appears in the types of any package that supports being loaded from a `<script>`.

## Where the file goes

```text
types/
  legacy-parser.d.ts
tsconfig.json
```

```json
{
  "include": ["src", "types"]
}
```

A `types` directory included by the project is the usual place for a declaration of a dependency. A declaration for a
local JavaScript file goes beside it, as `row.d.ts` next to `row.js`, and the compiler picks it up without anything else
being configured.

The one thing not to do is to leave a `.d.ts` outside `include`. It is then not part of the project, the editor reports
errors for it using defaults, and the errors are convincing and wrong.

## Nothing checks a declaration against the code

```ts
// legacy-parser.d.ts
export declare function parse(text: string): unknown[];

// legacy-parser.js
export function parse(text, options) {
  return String(text).split(',');
}
```

Both files compile and the declaration is wrong: the parameter is optional in the code, and the return is `string[]`
rather than `unknown[]`. A consumer gets a type that does not describe the function.

The check worth having is a test of the typed boundary. A small file in the test directory that imports the package and
uses it as the declaration claims will fail to compile when the declaration drifts:

```ts
import { parse } from 'legacy-parser';

const rows: unknown[] = parse('a,b');
```

That does not catch a wrong type, only a missing or renamed export. Catching a wrong type needs a run time assertion,
which is the same conclusion as everywhere else in this course: the type system describes code, and something has to
exercise the code itself.

## Check yourself

Write a declaration for a small module and use it from a `.ts` file. Then change the declaration so it disagrees with the
implementation and confirm that nothing reports it, and add an assertion in a test that does.
