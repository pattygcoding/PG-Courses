---
title: Modules and resolution
summary: Why the file extension is required, how a specifier is found, and where paths stop working.
chapter: The compiler
minutes: 13
status: draft
---

## The extension is part of the specifier

```ts
import { parseRow } from './row.js';
```

Under `module: "nodenext"` the specifier has to name the file that exists at run time, which after a compile is `row.js`
even though the source is `row.ts`. That surprises everyone once, and it is the correct answer: the import is a run time
instruction and the run time only knows the JavaScript.

```ts
import { parseRow } from './row';
```

```text
error TS2835: Relative import paths need explicit file extensions in ECMAScript
imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean
'./row.js'?
```

With `moduleResolution: "bundler"` the extension is optional, because a bundler resolves the specifier itself and it
tries several extensions. That is the setting for a front end, and it is why the two configurations disagree about
whether an import is valid.

## A project the bundler resolves

```json
{
  "compilerOptions": {
    "module": "preserve",
    "moduleResolution": "bundler"
  }
}
```

`bundler` allows the extensionless import and the `index.ts` directory import:

```ts
import { parseRow } from './row';
import { parseRow } from './row/index';
```

Node does not allow either, which is the reason these two settings exist rather than one. A project that is bundled never
needs to satisfy Node, and a project that Node runs has to.

## ESM and CommonJS in one repository

```json
{
  "name": "report",
  "type": "module"
}
```

The `type` field in `package.json` decides whether a `.js` file is a module or a script, and it is what Node reads at run
time. TypeScript has three extensions that make the answer explicit per file:

| Extension | Means |
| --- | --- |
| `.ts` | follows the nearest `package.json` `type` field |
| `.mts` | always a module |
| `.cts` | always CommonJS |
| `.d.ts` | a declaration, following the file it describes |

A `.cts` file using `import` is compiled to `require`, which is how a module that has to ship CommonJS is written next to
one that ships ESM.

## The exports field decides what a package exposes

```json
{
  "name": "@example/report",
  "exports": {
    ".": "./dist/index.js",
    "./csv": "./dist/csv/index.js"
  }
}
```

Under `moduleResolution: "nodenext"` the compiler reads that field, so a deep import into a path the field does not list
is an error rather than something that works until it does not:

```text
error TS2307: Cannot find module '@example/report/dist/csv/parse.js' or its
corresponding type declarations.
```

That error is the compiler enforcing a boundary the package declared, and it is the reason a library should list its
entry points. A package without an `exports` field allows any path, which is what a package that has not been reviewed
for this does.

## paths are a compile-time shorthand

```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["./src/*"]
    }
  }
}
```

`paths` teaches the compiler a specifier that is not a real path, so an import compiles:

```ts
import { parseRow } from '@app/row';
```

The emitted JavaScript keeps that specifier, and Node has no idea what `@app` means, so the runtime needs the same
mapping. A bundler configured with the alias works; a Node process needs the `imports` field in `package.json` or a
loader.

```json
{
  "imports": {
    "#row": "./src/row.js"
  }
}
```

The `imports` field is the standard version of the same idea, and it works at run time because Node reads it. It requires
the `#` prefix, which is deliberate: it keeps an internal specifier from looking like a package name.

That is the whole story of `paths`: it is a compiler setting, and every place it is used has to be told separately unless
it is written as `imports` or as a real relative path.

## The usual causes of a cannot find module

- The extension is missing under `nodenext`. The error names the fix.
- The package has no types and no `@types` package. The declarations lesson covers what to do.
- The path is right and the file is not in `include`, so it was never loaded.
- The package lists `exports` and the deep path is not in it.
- `moduleResolution` is `nodenext` and the import is extensionless, or the reverse.
- A case difference in a filename, which works on a case-insensitive filesystem and fails in a container.

The second and the last are the two worth checking first on a machine where it used to build.

## Check yourself

Write an import without an extension under `nodenext` and read the error, then fix it and switch the project to `bundler`
and check whether the error returns. Then add a `paths` alias, compile, and find the specifier in the emitted JavaScript.
