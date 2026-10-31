---
title: The tsconfig in detail
summary: Every flag worth setting, what each one does, and a baseline to start from.
chapter: The compiler
minutes: 14
status: draft
---

## The resolved configuration

```bash
npx tsc --showConfig
```

That prints the configuration after every inherited and implied value is applied, which is the only reliable way to know
what the compiler is doing. A flag that "has no effect" is usually being overridden further up a chain of `extends`, or
being replaced by a default the file did not set.

```json
{
  "extends": "@example/tsconfig",
  "compilerOptions": {
    "outDir": "dist"
  }
}
```

An `extends` merges the base into the file, and the relative paths inside the base resolve against the base's own
location. That is the trap: a `baseUrl` or a `paths` in a shared configuration points at the shared configuration's
directory, not at the project that extends it.

## Which files are in the project

```json
{
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["**/node_modules", "**/dist"]
}
```

`include` is a glob list and `exclude` removes from it, with `node_modules` and the output directory excluded by default.
A file that no glob matches is not in the project, which means the build does not check it and the editor reports errors
for it using defaults. That mismatch is the usual cause of an error that appears in the editor and not in the build.

```json
{
  "files": ["src/index.ts"]
}
```

`files` lists entries exactly and is the stricter of the two. A project that wants every file named explicitly uses
`files`; most projects use `include` and add a directory for a script or a test that would otherwise be missed. That
second mistake, a `scripts` directory nobody added, is worth checking for on any project where the editor and the build
disagree.

## The output flags

| Flag | Effect |
| --- | --- |
| `noEmit` | check and write nothing |
| `outDir` | where the JavaScript goes |
| `rootDir` | what the output structure is relative to |
| `declaration` | emit a `.d.ts` beside each file |
| `declarationMap` | a map from the declaration back to the source |
| `sourceMap` | a map from the JavaScript back to the source |
| `removeComments` | strip comments from the output |
| `importHelpers` | share the downleveling helpers instead of inlining them |
| `downlevelIteration` | compile a spread or a `for...of` for an older target |

A project whose output runs directly, such as a server or a CLI, sets `outDir`, `rootDir` and `sourceMap`. A project whose
output is bundled sets `noEmit` and treats the compiler as a checker, which is the usual arrangement for a front end. A
project that publishes a package adds `declaration`.

The `rootDir` mistake is worth naming: without it the compiler uses the longest common prefix of the inputs, so adding a
file outside `src` changes the output layout and breaks every relative import in the emitted code. Setting it explicitly
makes the layout independent of which files happen to be included.

## The module flags come in pairs

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext"
  }
}
```

`module` decides the syntax of the output and `moduleResolution` decides how a specifier is looked up. The pairs worth
knowing:

| Setting | For |
| --- | --- |
| `nodenext` | code that Node itself runs, including the `exports` field |
| `bundler` | code a bundler resolves, which allows imports Node forbids |
| `commonjs` | an older Node project, or a package that needs `require` |
| `preserve` | a bundler, with the import syntax left alone |

Setting `module` without `moduleResolution` leaves a default that may not match, so both are worth writing.
A mismatch shows up as an import that resolves in the editor and fails at run time, or the reverse.

## JavaScript in the project

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false
  }
}
```

`allowJs` lets `.js` files be part of the project and `checkJs` checks them. A project mid-migration has both on for one
directory, and a project that imports a `.js` package has `allowJs` on so the import resolves without the files being
checked. The migration lesson has the order to turn them on.

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

`skipLibCheck` stops the compiler checking the declaration files of dependencies. Turning it off produces errors inside
third party types that the project cannot fix, so nearly every project sets it. The cost is that an error inside a
declaration file the project does depend on is skipped as well.

## A baseline to start from

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["es2023"],
    "strict": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": []
  },
  "include": ["src"]
}
```

That is the configuration I would write for a new project, with three notes. `lib` has no `dom`, so a browser project
adds it. `types: []` stops the compiler pulling every `@types` package out of `node_modules`, which keeps the global
scope honest and makes an undeclared global an error rather than a surprise. And the two strictest flags,
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, are deliberately not in the list: they change how ordinary
code is written, so they belong in a discussion rather than in a default. The next lesson covers what each one costs.

## The flags that find style rather than bugs

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  }
}
```

`noUnusedParameters` reports a parameter that is never read:

```text
error TS6133: 'second' is declared but its value is never read.
```

An underscore prefix silences it, which is the convention for a parameter kept for its position:

```ts
function handler(event: Event, _context: Context): void { }
```

Those four are about tidiness rather than correctness, and a linter can do the same job. That matters when choosing where
to put a rule: the compiler is faster and always there, and the linter is more configurable.

## Diagnostics worth knowing

```json
{
  "compilerOptions": {
    "noErrorTruncation": true
  }
}
```

An error about a long type prints `SomeType<...>` in the middle, which hides the part you needed. `noErrorTruncation`
prints it in full, at the cost of messages several screens long. It is worth turning on while working on a generic type
and worth turning off again afterwards.

```bash
npx tsc --extendedDiagnostics
```

That prints where the time went: parse, bind, check, emit and the file counts. It is the first thing to run when a build
gets slow, and it usually shows the time is in checking rather than in emitting.

## Check yourself

Run `tsc --showConfig` on a project and find a flag you did not set. Then add a file outside `src`, watch the output
layout change, and fix it with `rootDir`. Finally name a file on the command line instead of using `-p` and explain why
the errors changed.
