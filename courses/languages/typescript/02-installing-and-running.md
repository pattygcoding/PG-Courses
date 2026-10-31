---
title: Installing and running
summary: Three ways to run a .ts file, and what each one does with the types.
chapter: Getting started
minutes: 13
status: draft
---

## Install the compiler

```bash
npm install --save-dev typescript
npx tsc --version
```

```text
Version 5.9.3
```

The compiler is a dependency rather than a global tool, so every project pins the version it was written against and a
new machine gets the same one. That matters more than it does for a linter, because the type system changes between
minor releases: an upgrade can report an error in code that was accepted before.

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

`tsc --noEmit` is the command to wire into a build. It reads the project, checks it and writes nothing, which is the
check on its own with no output to manage.

## Compile, then run

```bash
npx tsc src/report.ts --outDir dist --target es2023 --module nodenext
node dist/report.js
```

That is the whole pipeline: the compiler produces JavaScript and Node runs it. It works with no extra dependency and it
is the way to see what your types compile to, which is worth doing occasionally.

The cost is that every run needs the compiler to finish first. On a large project that is a build step, which is where
a runner comes in.

## Run without a separate step

```bash
npx tsx src/report.ts
node --experimental-strip-types src/report.ts
```

`tsx` transpiles each file as it loads and runs the result, which is fast and does not type check anything. Node's own
support strips the annotations and likewise checks nothing. Both are the right tool for running a script and the wrong
tool for finding a type error:

| Approach | Checks types | Runs the file |
| --- | --- | --- |
| `tsc` then `node` | yes | after a build |
| `tsx`, `node --experimental-strip-types` | no | yes |
| `tsc --noEmit` in the build, `tsx` in development | yes, then no | yes |

That last row is the arrangement most projects settle on: a fast runner for the edit and run loop, and the compiler in
continuous integration where a failure matters.

## What strip-only mode cannot run

```ts
enum Level { Quiet, Loud }
```

```text
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
```

Stripping removes annotations textually, so anything that generates code cannot be stripped. That covers `enum`, a
`namespace` with a value, a constructor parameter property and an experimental decorator. TypeScript has a flag that
reports them at compile time rather than at run time:

```json
{
  "compilerOptions": {
    "erasableSyntaxOnly": true
  }
}
```

Turning that on makes the four constructs a compile error, which is the setting to choose if the code is going to be
run by a stripper rather than compiled. The alternative is to compile and run the output.

## Watch mode

```bash
npx tsc --watch
npx tsx watch src/report.ts
```

`tsc --watch` rechecks on every save and prints the errors, which is slower than the editor's own checking and is the
version that fails a build. In practice the editor reports errors as you type and `tsc --noEmit` in continuous
integration is the gate, so watch mode is for the case where no editor is open.

## Which file the compiler reads

```bash
npx tsc                      # reads tsconfig.json in the current directory
npx tsc -p packages/api      # reads the config in that directory
npx tsc src/report.ts        # a single file, ignoring tsconfig.json
```

Naming files on the command line ignores the project config, which is why a one-file check can report errors that the
project does not have: the `lib`, the `types` and the strictness all come from defaults instead of from the file. Use
`-p` for anything real.

```bash
npx tsc --showConfig
```

That prints the configuration the compiler actually resolved, after every inherited value has been applied. When a flag
seems to have no effect, this is where to look.

## Check yourself

Install the compiler, compile one file and read the output, then run the same file with `tsx` and with Node's strip
mode. Add an `enum` and confirm the strip mode refuses it, then set `erasableSyntaxOnly` and confirm the compiler
refuses it instead.
