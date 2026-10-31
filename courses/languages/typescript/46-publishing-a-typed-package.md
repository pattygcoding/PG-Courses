---
title: Publishing a typed package
summary: The fields a consumer needs, what to test before a release, and the changes that break people.
chapter: Types for other people
minutes: 13
status: draft
---

## What a consumer reads

```json
{
  "name": "@example/report",
  "version": "1.2.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./csv": {
      "types": "./dist/csv/index.d.ts",
      "import": "./dist/csv/index.js"
    }
  },
  "files": ["dist", "src"],
  "sideEffects": false
}
```

Four fields carry the types. `types` is what an older resolver reads, the `types` condition inside `exports` is what a
`nodenext` resolver reads, `files` decides what is published, and `src` is in that list so the `declarationMap` files
have somewhere to point. The `sideEffects: false` is a bundler hint rather than a type field, and it is worth setting on a
library that genuinely has no import side effects.

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true
  }
}
```

The `target` for a published package is the interesting decision: it has to be old enough for the consumers the package
promises to support, and every version below `es2022` means the compiler rewrites more syntax and the package ships more
code. `es2020` is a reasonable floor for a package that supports Node 14 and above; a package that requires Node 20 can
target `es2023`.

## Test the declaration as a consumer sees it

```ts
import { parse, type Row } from '@example/report';

const rows: Row[] = parse('a,b');
```

That file is a test, and it has to live outside the package's own `src` so it goes through the same resolution a consumer
does. Putting it in the `src` directory defeats the purpose: inside the project, the import resolves through the source
files rather than through the built declaration.

```json
{
  "include": ["src", "test-d"]
}
```

The name `test-d` is a convention for declaration tests, and a separate `tsconfig.json` for that directory is common so
that the test can be compiled with the library's `dist` rather than its `src`. The check to run is
`tsc -p test-d --noEmit` on the built output, which catches a missing export, a type that did not make it into the
declaration, and an `exports` entry that points at the wrong file.

## What a declaration test can and cannot catch

It catches:

- An export that is missing from the declaration file.
- A type that is referenced by an export but not reachable in the declaration.
- An `exports` map that resolves to a file that does not exist or a `.js` without a `.d.ts`.
- A module format mismatch, where the declaration says CommonJS and the runtime needs ESM.

It does not catch a declared type that disagrees with the implementation. Nothing does, which is why the test file is worth
pairing with a run time assertion in the package's own test suite.

## The changes that break a consumer

Adding a member to an interface is safe. Changing a function's parameter type, adding a required parameter, narrowing a
return type or removing an interface member is not, and the version number should say so.

The ones that are easy to miss:

| Change | Breaks |
| --- | --- |
| A parameter's type narrowed | every caller passing the wider type |
| A property made required | every construction site |
| A type parameter added | an explicit type argument in the old position |
| A union member removed | every switch over it |
| `readonly` added to a property | every assignment |
| A generic's constraint tightened | every instantiation outside the new constraint |

A declaration is an API, and the changes above are API changes even when the JavaScript is byte for byte identical. That
is the reason a library worth maintaining runs the declaration test on every pull request, and the reason a `strict` build
is worth having in a library even when the application consuming it is not strict.

## The version that a type change needs

A type-only change that breaks a consumer still needs a major version, because the consumer's build fails. The tempting
answer, that a change to a declaration is not a change to the code, produces a project that will not compile after a
minor upgrade, which is worse than a version bump.

Where a type change cannot be avoided without a major version, the tool is a deprecated overload or a union widened
rather than narrowed, so old and new call sites both compile and the old one reports through an editor hint rather than
an error.

## Check yourself

Add a `test-d` directory to a project with a package and a test that imports it by name, then break an `exports` entry and
confirm the test catches it. Then make a property required and describe which version number that deserves.
