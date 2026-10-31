---
title: The editor and the language service
summary: Why the editor is faster than the build, what it knows that tsc does not, and the two settings that keep them agreeing.
chapter: Getting started
minutes: 12
status: draft
---

## Two programs, one compiler

`tsc` is a batch compiler: it reads the project, checks it and exits. The editor talks to `tsserver`, which is the same
compiler running as a service that answers questions about a file as you type. That is why the editor can show a type
on hover, jump to a definition and rename a symbol across the project, and why a project large enough to make `tsc`
slow is still responsive while typing.

Both read the same `tsconfig.json`, so what the editor reports and what the build reports are the same errors. When
they disagree, the cause is almost always one of the two settings below.

## Use the version the project pins

```text
TypeScript: Select TypeScript Version... -> Use Workspace Version
```

An editor ships its own compiler, and a project with a pinned dependency has a different one. If the editor uses its
own, an error appears in the editor and not in continuous integration or the other way round, and the difference is
usually a change in the type system between the two versions. Pointing the editor at the project version removes the
whole class of confusion.

## The nearest config wins

The editor reads the `tsconfig.json` nearest to the file being opened, walking up the directory tree. A monorepo with a
config per package means each file gets its package's settings, which is almost always right. It goes wrong when a file
is not matched by any `include`, at which point the editor falls back to a default configuration and reports errors for
a project it does not belong to.

```json
{
  "include": ["src", "test", "scripts"]
}
```

A `scripts` directory that is missing from `include` is the usual culprit: the editor checks it with defaults, the
build ignores it, and the errors in it are convincing and wrong.

## What the editor gives you that the compiler does not

| Action | What it answers |
| --- | --- |
| Hover | the inferred type of any expression, which is how you learn inference |
| Go to definition | where a symbol comes from, including through a `.d.ts` |
| Find all references | every use, which is how a refactor is checked |
| Rename symbol | a rename across the project that the compiler verifies |
| Quick fix | the code action for an error, often the import that is missing |
| Show type of expression | the same as hover, bound to a shortcut |

Hovering is the fastest way to learn this language: write an expression, hover it, and read the type the compiler
inferred. That is the feedback loop that makes generics and narrowing learnable, and no amount of reading documentation
replaces it.

```ts
const byKey = new Map([['a', 1]]);
```

Hovering `byKey` shows `Map<string, number>`, which is inference at work: nothing was annotated and the type came from
the argument.

## The errors panel

A project with a few hundred errors shows them all in the panel, which is useful once and overwhelming daily. Two
practices help: work one file at a time and use the panel filtered to the open file, and treat the count as a
temporary state rather than a target. The count going down is the progress bar for a migration.

```json
{
  "compilerOptions": {
    "noErrorTruncation": true
  }
}
```

A long type is printed as `SomeType<...>` in the middle of a message, which is unreadable. `noErrorTruncation` prints it
in full, which is worth having while working on a generic type and worth turning off again afterwards because the
messages get very long.

## Reading a type error

```text
error TS2345: Argument of type '{ key: string; value: number; }' is not assignable to
parameter of type 'Row'.
  Property 'level' is missing in type '{ key: string; value: number; }'
  but required in type 'Row'.
```

The first line names the types, the indented lines explain why, and there can be several. Read from the bottom up: the
innermost reason is the one to fix. In a generic error the message can be a screen long, and the useful part is
usually the last nested line naming the property or the type parameter.

## Check yourself

Open a project, hover three expressions and write down the types the compiler inferred. Then find a symbol and use
rename across the project, and use find all references on the same symbol to check the rename was complete. Finally
make the editor use the workspace TypeScript version.
