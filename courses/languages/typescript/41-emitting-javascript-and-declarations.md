---
title: Emitting JavaScript and declarations
summary: What the compiler writes, how the target changes it, and what a package has to ship.
chapter: The compiler
minutes: 13
status: draft
---

## What the target changes

```ts
class Store {
  rows = new Map<string, string>();

  get first(): string | undefined {
    return this.rows.get('a')?.trim();
  }
}

async function load(): Promise<void> {
  await Promise.resolve();
}
```

Compiled for `es2023`, that is nearly the source with the annotations removed. Compiled for `es2015`, the optional chain
becomes a conditional, the class field becomes an assignment in the constructor, and the `async` function becomes a
generator wrapped in a helper. The `target` decides how much of that rewriting happens, which is why it is worth setting
to the oldest runtime the code has to support rather than to what feels safe.

```json
{
  "compilerOptions": {
    "target": "es2023"
  }
}
```

For code that only runs in Node 20 or a current browser, that is the setting, and it means almost nothing is rewritten.
The one thing to know is that `target` also affects which built-in methods the checker believes exist, because it decides
the default `lib`: setting `target: "es2015"` without a `lib` makes `Object.fromEntries` an error.

## Declaration emit

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}
```

For a source file, the compiler writes a `.d.ts` beside the JavaScript. The declaration contains the public shape and
none of the bodies, and it is what a consumer's compiler reads:

```ts
export interface Row {
  key: string;
  value: number;
}

export declare function parse(text: string): Row[];

export declare class Store {
  private rows;
  constructor(name: string);
  readonly name: string;
  get count(): number;
}
```

Two things to notice. A private field becomes a `private rows;` with no type, which is enough to make the type nominal for
a structural check without exposing anything. And `parse` is `declare`, because a declaration states a type rather than
implementing one.

A type reachable from an export appears in the declaration, even when it is not exported itself:

```ts
type Internal = { unused: string };

export type Alias = Internal;
```

```ts
type Internal = {
    unused: string;
};
export type Alias = Internal;
export {};
```

That `Internal` is in the output because `Alias` needs it, which is the constraint worth remembering: the declaration file
is the public API, and everything reachable from it is part of the promise. A type used by nothing exported does not
appear at all, so it can be renamed or removed without breaking a consumer.

## declarationMap makes a declaration navigable

```json
{
  "compilerOptions": {
    "declarationMap": true,
    "sourceMap": true
  }
}
```

`sourceMap` lets a debugger show the source file for a stack frame in the output. `declarationMap` lets go-to-definition in
a consumer's editor open the original `.ts` rather than the `.d.ts`. For a library, `declarationMap` is what turns "jump
to definition" from a wall of declarations into the documented source, and it is cheap.

The maps point at paths, so a package that publishes them has to publish the sources as well, or the editor opens a file
that is not there. That is why a published package usually includes `src` alongside `dist`.

## The fields a package needs

```json
{
  "name": "@example/report",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "src"]
}
```

`types` is the field older resolvers read, and the `types` condition inside `exports` is what a `nodenext` resolver reads.
Getting both right matters for a package that has to work in both worlds, and the order of the conditions in `exports`
matters as well: `types` has to come first, because a resolver takes the first match.

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "noEmitOnError": true
  }
}
```

`noEmitOnError` stops the compiler writing output when there is an error, which prevents a broken build from being
published. It is worth having on in a build script and worth leaving off in a watch loop, where a partially written output
is more useful than none.

## Emit only, or check only

```bash
npx tsc --noEmit
npx tsc --emitDeclarationOnly
npx tsc --outDir dist
```

Three modes worth keeping straight. `--noEmit` checks and writes nothing, which is the front end arrangement where a
bundler produces the JavaScript. `--emitDeclarationOnly` writes the declarations and no JavaScript, which is what a
project whose JavaScript comes from a bundler needs. And the plain run writes both, which is the arrangement for a Node
package with no bundler.

A project that uses a bundler to emit has to be careful that the bundler and the compiler agree about the target and the
module format, because they are two separate configurations for the same decision. Where they disagree, the code works in
development and fails after a build.

## Where the emit is not the compiler's job

A modern front end ships through a bundler, and TypeScript's own emit is used for the declarations. The reasons are
minification, code splitting, asset handling and the build speed of a tool written to do only that. A Node service or a
CLI with no bundler is the case where the compiler's own output is what runs, and there `tsc` is the whole pipeline.

## Check yourself

Compile one file for `es2015` and for `es2023` and diff the output, then look at the `.d.ts` for a file with a private
field and one with an exported type used only internally.
