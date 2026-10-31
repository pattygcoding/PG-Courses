---
title: Linting, formatting and types
summary: Three tools that catch the mistakes a test does not, and the order worth setting them up in.
chapter: Testing and quality
minutes: 12
status: draft
---

## A formatter removes a whole class of review comment

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100
}
```

Prettier or Biome rewrites the file and settles every argument about line breaks. Run it on save and in continuous
integration with a check that fails when a file is not formatted:

```bash
npx prettier --check .
```

That command is the useful one for a build, because it reports instead of rewriting. A formatter that rewrites files
during continuous integration produces a diff nobody reviews.

## A linter catches the mistakes a test does not

```js
// eslint.config.js
export default [
  {
    files: ['**/*.js'],
    rules: {
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-return-await': 'error',
    },
  },
];
```

The rules worth turning on early are the ones that catch a real mistake:

| Rule | Catches |
| --- | --- |
| `eqeqeq` | a loose comparison |
| `no-var` | a function scoped binding in new code |
| `prefer-const` | a `let` that is never reassigned |
| `no-unused-vars` | a leftover after a refactor |
| `no-return-await` | an unnecessary `await` in a return |
| `no-floating-promises` | an unawaited promise, with type information |

That last one needs a type checker, which is the reason to add types even to a plain JavaScript project.

## Types in a JavaScript project

```js
// @ts-check

/**
 * @param {string} line
 * @returns {{ key: string, value: number }}
 */
export function parseLine(line) {
  const [key, value] = line.split(',');
  return { key: key.trim(), value: Number(value) };
}
```

A `// @ts-check` comment at the top of a file makes the editor check that file. A `checkJs` setting in `jsconfig.json`
does it for the project. JSDoc comments carry the types, which gives most of what TypeScript gives without a build step
and without renaming a single file.

```json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "noEmit": true,
    "module": "nodenext",
    "target": "es2023"
  }
}
```

`noEmit` for a project that runs the JavaScript directly, and `strict` for the checks that catch the most. Adding types
to an existing codebase incrementally is a matter of turning on `checkJs` per directory, which is why the JSDoc route
works where a full rewrite does not.

## What to run before a commit

```bash
node --test
npx eslint .
npx prettier --check .
npx tsc --noEmit
```

Four commands, and the same four in continuous integration. The order matters only in that the fast ones belong first,
because the value of a check is proportional to how often it runs.

A pre-commit hook that runs the formatter on staged files is worth having, and the rest is worth leaving to the build.
A commit that takes thirty seconds is a commit that gets skipped with `--no-verify`.

## A shared configuration

An ESLint configuration that lives in one repository and is published makes every project consistent, and it is the
reason a large codebase has one style without a document describing it. The same is true of the `tsconfig`, which is
worth extending rather than copying:

```json
{
  "extends": "@example/tsconfig-base",
  "compilerOptions": { "outDir": "dist" }
}
```

## Check yourself

Add ESLint with `eqeqeq` and `prefer-const` to a project and fix what it reports. Then add a `// @ts-check` comment to one
file and see what the editor says about a value whose type is unclear.
