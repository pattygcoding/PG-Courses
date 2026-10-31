---
title: Linting and formatting
summary: next lint is gone, the flat config is three imports, and the two tools do different jobs.
chapter: Quality
minutes: 11
status: draft
---

## The command that was removed

```json
"scripts": {
  "lint": "eslint"
}
```

Older versions had `next lint`, which wrapped ESLint and added its own rules and a directory argument. In version 16 it is
gone, and linting is the tool itself. The migration is mechanical, and the upgrade codemod does it: the script changes, and the
config moves to the format ESLint expects now.

That matters beyond the command. A framework that owns your linter's version owns a dependency you cannot upgrade on your own
schedule, and the removal is a deliberate step away from that.

## The generated config

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

Three things to notice:

| Line | Meaning |
| --- | --- |
| `core-web-vitals` | the rules that catch the mistakes which cost a visitor time, rather than an argument |
| `typescript` | the rules for TS files, on top of the base set |
| `globalIgnores` | build output and generated types, which are not yours to fix |

The two presets are the same rules a Next.js project has shipped for years. The difference is that they are now imported by
name into a flat config, so you can see what is enabled and add your own entries without fighting a wrapper.

`core-web-vitals` is worth reading once, because it is opinionated in a useful way. It promotes the rules about images,
fonts and scripts into errors, and leaves the stylistic arguments out.

## Running it

```bash
npm run lint
```

```text
> pg-nextjs-verify@0.1.0 lint
> eslint
```

No output is the pass. ESLint exits with a non-zero status when it finds something, which is what a CI job needs:

```bash
npm run lint && npm test && npm run build
```

Three commands in that order, because each one is cheaper than the next and each one catches a different class of mistake. A
lint error is seconds, a failing test is a minute, and a build failure after both is a real problem.

## What a linter is for

The rules in this project are the correctness kind:

| Rule class | Example it catches |
| --- | --- |
| hooks | a `useEffect` with a missing dependency |
| accessibility | a `<button>` with no accessible name |
| imports | a module that does not exist, or a `require` in an ESM file |
| unused code | an imported name nothing uses |

A linter is not a reviewer and it is not a type checker. It catches the mechanical mistakes so that a review can be about the
design, and it runs on save so that the mistake never reaches a review at all.

## Formatting is a separate decision

ESLint can format, and it should not. The split that ages well:

- **ESLint** for the rules that catch bugs and accessibility problems;
- **a formatter** for indentation, quotes, line length and trailing commas.

Prettier is the common choice, and the arrangement that avoids a fight is to let it own the layout and turn off the ESLint
rules that overlap with it, so a line is never reported by both. Stylistic ESLint rules are the ones that generate the
diffs nobody wanted, in files nobody was changing.

This application has no formatter configured, and its code is already consistent, because it was written to a convention
rather than reformatted to one. That is a legitimate arrangement for a project with a single author and a bad one for a team:
a formatter is how a team stops having the argument in review comments.

## Editor and CI

Both are worth doing and they do different jobs:

- **The editor** lints the file you are in and shows the problems as you type, which is the cheapest possible fix.
- **CI** runs the same command on everything, which is the only version that cannot be skipped.

The one trap is a difference between the two. An editor plugin with its own copy of ESLint and its own config can report a
different set of problems from the command line, and the fix is to point it at the project's own installation. The command
line is the truth.

## Check yourself

Add a rule of your own to `eslint.config.mjs` that bans a specific import from a specific directory, for instance the data
layer from anything under `components/`. Then break it deliberately in one file and confirm both the editor and `npm run lint`
report it.
