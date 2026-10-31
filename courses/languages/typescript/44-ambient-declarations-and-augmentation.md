---
title: Ambient declarations and augmentation
summary: Adding to a type someone else declared, and the import that makes it work.
chapter: Types for other people
minutes: 13
status: draft
---

## Augmenting a library's type

```ts
import 'express';

declare module 'express' {
  interface Request {
    user?: { id: string };
  }
}
```

That adds a `user` property to Express's `Request` type, and the middleware that attaches it no longer needs an `any`.
The mechanism is interface merging: the `Request` inside the block is merged with the one the library declared, because
the module name matches.

```ts
export { };

declare module 'express' {
  interface Request {
    user?: { id: string };
  }
}
```

An empty export does the same job, and it does not require the package to be installed. Either form works, and the
documented requirement is that the file is a module, so that the `declare module` block merges with the module the
compiler resolves rather than declaring a new ambient module of the same name.

That distinction does not produce a failure in TypeScript 5.9 in the cases I tested: a block in a script file merged with
an ambient declaration of the same name and with the real `vue` package's types in both forms, for an interface member and
for a new function. The rule is still worth following, because it is what the compiler documents and because a script
file's declarations are global in other ways. The practical version of the advice is: write the augmentation in a file
with an explicit `import` of the module, or an `export { }`, and read what you wrote as a statement of intent.

## The failure that does happen

```ts
declare module 'express' {
  interface Request {
    user: { id: string };
  }
}
```

An augmentation that declares a property with a type that conflicts with another augmentation of the same property
produces an error about the two being incompatible, and the message names both declarations. That is the shape of the
problem to look for when an augmentation appears to have no effect or the wrong effect: two files are both adding to the
same interface, and one of them is winning.

The other one is simpler: the property is added and the code at the point of use is reading a different type. A framework
that wraps Express and declares its own `Request` is the usual case, and hovering the type at the call site shows which
one is in play.

## Augmenting a global

```ts
export { };

declare global {
  interface Window {
    analytics?: { track(event: string): void };
  }

  var __DEV__: boolean;
}
```

A `declare global` block inside a module adds to the global scope. `interface Window` merges with the existing one, so the
property is added rather than replacing anything. `var __DEV__: boolean;` declares a global variable, and `var` is
required rather than `const` because a global binding has to be declared with a variable statement the compiler can merge.

```ts
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
  }
}
```

That is the same pattern for Node's process environment, and it is worth doing on any project that reads an environment
variable: it turns `process.env.DATABASE_URL` from `string | undefined` into `string`, once, at the boundary where the
value is actually known to be present. The validation that makes that claim true still has to exist, which is the honest
half of the note.

## The triple slash reference

```ts
/// <reference types="node" />
```

A triple slash directive at the top of a file includes a types package, which is the older mechanism that `types` in
`tsconfig.json` replaced. It still appears in generated declarations, and it is the way to reference a global declaration
from a single file rather than for the whole project.

```json
{
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src", "types"]
}
```

`types` lists which global declaration packages are loaded, and `include` is what makes a local `types` directory part of
the project. A `.d.ts` file outside `include` is not loaded and the augmentation silently does nothing, which is the
second most common reason an augmentation "does not work".

## The reasons an augmentation has no effect

1. The file is not in `include`, so it was never read.
2. The interface being extended is not the one being used. Express and a framework wrapper around it is the usual case.
3. Two files both augment the same interface with a conflicting type, and the message about the incompatibility is being
   ignored.
4. The package's own types were changed to add the property, so the augmentation is now a duplicate declaration with a
   different type.
5. A `.d.ts` that is inside `node_modules` is being edited, so the change is lost on the next install.

The second is the one that takes time, and the way to find out is to hover the type at the point of use. If the property
is not in the hover, the augmentation did not land; if it is there with the wrong type, two declarations are fighting.

## Keeping it tidy

```text
types/
  express.d.ts
  globals.d.ts
  node-env.d.ts
```

One file per thing being augmented, all included by the project. A single `globals.d.ts` with everything in it becomes
unreadable at about the fourth augmentation, and a file per target makes it obvious what a change affects.

An augmentation is a global decision, so it is worth reviewing like one: the properties it adds become available
everywhere, and nothing at a call site says where they came from.

## Check yourself

Augment a global with `declare global` in a module and use it from another file. Then remove the import or the export that
makes the file a module and read what the compiler says about the original type.
