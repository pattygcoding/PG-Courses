---
title: The types registry
summary: How a package's types are found, what DefinitelyTyped is for, and when to publish your own.
chapter: Types for other people
minutes: 12
status: draft
---

## Where the types come from

```ts
import { ref } from 'vue';
```

When the compiler resolves that import, it looks for types in a fixed order:

1. A `types` condition in the package's `exports` entry.
2. The `types` or `typings` field in the package's `package.json`.
3. A `.d.ts` file next to the resolved `.js` file, which is how `dist/index.d.ts` is found for `dist/index.js`.
4. A `@types/<package>` package, if one is installed.

The fourth is the fallback that catches most packages that were written in JavaScript. `@types/express` is a separate
package published by whoever volunteered, and installing it does not change `express` itself.

```bash
npm install --save-dev @types/express
```

A `@types` package is always a development dependency, because it contains no run time code. It is looked up by name, so
the scoping rules matter: `@types/foo__bar` is the types package for `@foo/bar`, which is how a scoped package's types are
named.

## @types and the global scope

```bash
npm install --save-dev @types/node
```

`@types/node` is different from the others: it declares globals such as `process`, `Buffer` and `setTimeout`, so it
affects the whole project rather than one import. That is the package worth being deliberate about, and it is why the
baseline configuration in the earlier lesson sets `types: []`: with an empty list, the compiler loads no global
declaration package automatically, and the project has to name the ones it wants.

```json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

With that list, only `@types/node` is loaded automatically. Any other `@types` package has to be imported explicitly,
which is exactly the property you want: `@types/jest` adding `describe` and `it` to every file in the project is how a
test-only global ends up in production code.

## DefinitelyTyped

A package with no types and no `@types` package is the case for a hand-written declaration, as the previous lessons
covered. Where the package is widely used, the declaration belongs upstream: DefinitelyTyped is a single repository that
publishes every `@types` package, and contributing there shares the work.

The structure is one directory per package with four files:

```text
types/thing/
  index.d.ts
  thing-tests.ts
  tsconfig.json
  package.json
```

The `thing-tests.ts` file is the important one: it is a file of code that uses the declaration, so a change that breaks a
consumer is caught by the repository's own test run. That is the same pattern the declaration lesson recommended at
project scale, applied at registry scale.

A contribution there needs the declaration to be maintained, because a package that changes its API without anyone
updating the types leaves every consumer with a wrong type. Where a package has an active maintainer who would rather
ship types themselves, that is the better outcome, and it is what the next lesson covers.

## Deciding what to do about a package with no types

| Situation | What to do |
| --- | --- |
| Widely used, no types | check for an existing `@types` first, then contribute upstream |
| One project, stable API | a `declare module` block in `types/` |
| The package documents its API well | a hand-written declaration you maintain |
| A package you control | ship the types from the package |
| A package with no stable API | `unknown` at the boundary and validation at run time |

The last row is the honest one for a library that changes shape often: a declaration that drifts is worse than no
declaration, because it produces a type error that is not a real problem or, worse, a value typed as something it is not.

## The version pin

```bash
npm install --save-dev @types/node@22
```

A `@types` package versions independently of the thing it describes, so the version to install is the one matching the
runtime, not the newest. `@types/node@22` describes Node 22. Installing the newest on an older runtime produces types for
functions that do not exist there, which is a failure at run time with no compile error.

## Check yourself

Find an import in a project and work out which of the four resolution steps found its types, using go-to-definition on
the imported symbol to see which file the compiler landed in. Then add `types: []` and see which globals stop existing.
