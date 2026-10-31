---
title: The tsconfig file
summary: The handful of flags that decide what the compiler accepts, and the ones that are noise.
chapter: Getting started
minutes: 13
status: draft
---

## The file the compiler reads

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["es2023"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

`compilerOptions` decides what the check means, and `include` decides which files are in the project. A file that is
not matched by `include` is not checked at all, which is the usual reason an editor reports an error that the build
does not and the other way round.

```bash
npx tsc --showConfig
```

That prints the configuration the compiler resolved, with every implied value filled in. It is the answer to "why is
this flag not doing anything", and it is worth running once on any project you are joining.

## Three flags worth understanding first

**`strict`** turns on a family of checks at once:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitThis": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "strictBuiltinIteratorReturn": true,
  "alwaysStrict": true,
  "useUnknownInCatchVariables": true
}
```

Those are the resolved values from `--showConfig`, so the one flag is worth all of them. `strictNullChecks` is the one
that changes the most: without it, `null` and `undefined` are assignable to everything and the compiler cannot tell you
that a value might be missing.

```ts
// Without strictNullChecks, this is accepted and fails at run time.
function size(value?: string): number {
  return value.length;
}
```

```text
error TS18048: 'value' is possibly 'undefined'.
```

**`target`** decides which JavaScript is emitted and which built-in methods the compiler believes exist. `es2023` for a
current Node, `es2020` or lower for a target that needs the newer syntax rewritten. It does not affect what is checked
in the source, only the emit and the library defaults.

**`module` and `moduleResolution`** decide how imports are understood. `nodenext` follows the rules of the runtime you
are on, including the `exports` field of a package. `bundler` is for a project that a bundler resolves, because a
bundler allows imports that Node does not. The pair is worth setting together and not guessing.

## lib decides which globals exist

```json
{
  "compilerOptions": {
    "lib": ["es2023"]
  }
}
```

`lib` lists the built-in type declarations the compiler knows about. There is no `dom` in that list, so this does not
compile:

```text
error TS2584: Cannot find name 'console'. Do you need to change your target library?
Try changing the 'lib' compiler option to include 'dom'.
```

That error is the compiler being honest: it has no idea what `console` is, because that is a host API rather than part
of the language. A project gets `console` from the `dom` lib, from `@types/node`, or from a declaration of its own,
which is what this course's snippets do.

The same applies to `document`, `fetch` and `localStorage`: they are not the language, they are the platform, and
`lib` is where the compiler is told which platform to assume.

## skipLibCheck and the noise

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

Without it the compiler checks the declaration files of every dependency, including the ones with errors in them. It
turns a clean project into a wall of messages about a library you cannot fix, so nearly every project sets it. The
cost is that an error inside a declaration file you do depend on is also skipped, which is a real but much smaller
problem.

## The emit flags

| Flag | Effect |
| --- | --- |
| `noEmit` | check only, write nothing |
| `outDir` | where the JavaScript goes |
| `rootDir` | the directory the output structure is relative to |
| `declaration` | emit a `.d.ts` beside each file |
| `sourceMap` | emit a map back to the source |
| `removeComments` | strip the comments from the output |

A service or a script that compiles its own output sets `outDir` and `rootDir`. A project where a bundler handles the
emit sets `noEmit` and treats the compiler as a checker, which is the common arrangement for a front end.

## Extending a shared configuration

```json
{
  "extends": "@example/tsconfig-base",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

An `extends` makes one repository's settings the default for others, so a team agrees on strictness once. The
relative paths in an extended file resolve against the file that declares them, which is the one detail that catches
people: a `baseUrl` in the base config is relative to the base config, not to the extending one.

## Check yourself

Run `npx tsc --showConfig` on a project and find a flag you did not set. Then remove `strict`, confirm that a null
check stops being reported, and put it back. Finally take `console` out of `lib` and read the error.
