---
title: Build performance and project references
summary: Incremental builds, splitting a monorepo, and finding the type that makes the compiler slow.
chapter: The compiler
minutes: 13
status: draft
---

## Incremental builds

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

`incremental` writes a file recording what was checked, and the next run reuses it. The effect on a large project is the
difference between a few seconds and a minute, and the cost is a build artefact to keep out of version control and to
delete when it goes wrong.

```bash
npx tsc --build
```

`--build` is the mode that reads each project's build information file and skips one that is up to date, which is what
makes a referenced project graph fast. It also checks the output timestamps of the projects it depends on, so it is the
command to use in continuous integration rather than `tsc -p`.

`tsc --watch` uses the same machinery to recheck only what changed. It is the closest thing to an incremental CI run on a
developer machine.

## Project references

```json
{
  "references": [{ "path": "../core" }]
}
```

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist"
  }
}
```

A `composite` project can be referenced by another, and referencing one lets the compiler read the other's declaration
files instead of its source. The requirement is that a composite project emits declarations, because those are what the
consumer reads, and that it has a `rootDir` and an `outDir` so the output locations are predictable.

The payoff in a monorepo is that a change to one package rechecks that package and the packages that reference it, rather
than everything. The cost is a build order and an artefact directory per package, which is why it is worth doing at five
packages and not at two.

```text
packages/
  core/       tsconfig.json (composite, emits declarations)
  api/        tsconfig.json (references ../core)
  cli/        tsconfig.json (references ../core)
tsconfig.base.json
```

A shared `tsconfig.base.json` holds the strictness and the target, and each package extends it and adds its own `rootDir`
and `outDir`. That is the arrangement I would use, and it keeps the strictness in one place where a review can see it.

## Why a project gets slow

The compiler's time goes into two things: checking the files it has, and instantiating generic types. The second is the one
that surprises people, because a single type can do it.

```ts
type Grow<T> = T extends string ? Grow<`${T}x`> : never;

type Boom = Grow<'a'>;
```

```text
error TS2589: Type instantiation is excessively deep and possibly infinite.
```

That error is the compiler refusing to recurse further. The conditional above has no base case that terminates, because
`T` stays a string after every step, so the compiler is right to give up. A recursive type over a template literal, a
deep mapped type and a chain of conditionals are the three common causes, and one of them in a hot position can add
seconds to every check.

What the compiler does *not* do is report a recursion that terminates. A deep mapped type instantiated ten levels down
compiles and costs time, so the slow case has to be found by measurement rather than by looking for an error.

```bash
npx tsc --generateTrace ./trace
```

That writes a trace of the checker's work that can be opened in a viewer, which names the types that took the time. It is
the tool for the case where `--extendedDiagnostics` says checking is slow and nothing obvious explains it.

## The habits that keep a build fast

- **Name the types.** A named alias is instantiated once and referred to by name afterwards, and hovering it prints the
  name rather than the expansion.
- **Keep a recursive type behind a base case the compiler can see.** A conditional that recurses on a smaller input works;
  one that recurses on the same shape does not.
- **Keep a union small when a mapped type walks it.** The cost is the product of the sizes, as the template literal lesson
  noted.
- **Keep `skipLibCheck` on.** Checking the dependencies' declaration files is work that cannot change the project and it is
  a large fraction of a cold build.
- **Split the project when the build gets slow, not before.** A references graph is a real cost in configuration, and it
  buys nothing on a project that checks in two seconds.

## isolatedDeclarations

```json
{
  "compilerOptions": {
    "isolatedDeclarations": true
  }
}
```

That flag requires every exported value to have a type the compiler can write into a declaration file without inferring it
from the body, which lets a declaration emit happen per file without a full type check. For a large library it turns
declaration output into something a bundler can do in parallel, and the price is an explicit type on every export.

```ts
export function parse(text: string) {
  return text.split(',');
}
```

```text
error TS9007: Function must have an explicit return type annotation with
--isolatedDeclarations.
```

The error is the flag saying it cannot produce a declaration without the body, and the fix is the return type annotation
that the inference lesson already argued for on every exported function. It is a flag for a library that has decided the
emit speed matters, not something to turn on by default.

`isolatedDeclarations` is also the reason a declaration file can be generated by a transpiler rather than by the type
checker, which is what makes a parallel build possible. The trade is stated exactly in the error: every exported value
needs a type that can be printed without inference.

## Check yourself

Run `tsc --extendedDiagnostics` on a project twice and compare the incremental run with the cold one. Then find a
recursive type in a codebase and work out whether its base case is one the compiler can see.
