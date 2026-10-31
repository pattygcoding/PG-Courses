---
title: Typed linting and formatting
summary: Which rules need the type checker, where each check belongs, and the one place not to duplicate it.
chapter: Testing and quality
minutes: 13
status: draft
---

## Three tools with three jobs

| Tool | Answers |
| --- | --- |
| Prettier | what the code looks like |
| The compiler | whether the types work out |
| ESLint with types | whether the code does something suspicious |

Prettier is a formatter: it takes the source and reprints it, with no configuration beyond a couple of options, so a
project stops arguing about line breaks. The compiler is covered by this whole course. ESLint is where a rule that is not
about types lives, such as forbidding a `console.log` in a module or requiring a naming convention.

The interesting third case is a rule that is about types but that the compiler cannot enforce, which is what
`typescript-eslint` provides.

## The rules that need a type

```js
// eslint.config.js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
```

`recommendedTypeChecked` is the preset that includes the rules needing type information, and `projectService` is what gives
the linter a program to ask questions of. That is the whole configuration change: the rules that need types are the ones
worth having, and they need the project.

Without the project configuration the type-aware rules produce an error saying they need type information, which is the
reason a project that "turned on the strict preset" sees nothing happen.

## The rules worth knowing by name

| Rule | Catches |
| --- | --- |
| `no-floating-promises` | a promise created and not awaited or returned |
| `no-misused-promises` | an async function passed where a `void` callback is expected |
| `await-thenable` | `await` on something that is not a promise |
| `no-unsafe-assignment` | an `any` assigned to a typed variable |
| `no-unsafe-member-access` | a member read off an `any` |
| `no-unsafe-call` | an `any` called |
| `no-unnecessary-condition` | a check that cannot be false |
| `no-unnecessary-type-assertion` | an `as` that changes nothing |
| `restrict-template-expressions` | an object interpolated into a string |
| `consistent-type-imports` | an import that should be `import type` |

`no-floating-promises` is the one I would enable first in any codebase. A promise that is neither awaited nor returned is a
silent failure, the compiler cannot see it, and it is one of the most common bugs in asynchronous JavaScript.

`no-unnecessary-condition` is the most opinionated of the list, because it flags a defensive check that the types say
cannot fail. That is usually right and occasionally wrong: a value from an external system typed optimistically makes the
check look unnecessary. The rule is worth having and worth reading each report before acting on it.

`no-unsafe-assignment` and its siblings are what make an `any` visible. They do not stop the `any`, they report every
place it spreads, which is how a project finds the boundary that needs a schema.

## Typed linting costs a program

The linter builds the same program the compiler does, so a type-aware run takes seconds rather than milliseconds, and it
is proportional to the project size. Two consequences:

- In an editor, the expensive rules are fine because the program is already loaded.
- In continuous integration, the lint job is a second full type check, which is worth knowing when the pipeline is slow.

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fast": "eslint . --no-warn-ignored"
  }
}
```

If the cost is a problem, the answer is to separate the type-aware rules from the rest rather than to drop them: a fast
pass with the syntax rules on every save and a full pass in continuous integration.

## Where each check belongs

- **Formatting** in Prettier, in a pre-commit hook and in continuous integration, because it is cheap and a diff full of
  whitespace hides real changes.
- **Types** in the compiler, in the editor and in continuous integration. Nothing else should re-implement a type check.
- **Unused variables** in the compiler (`noUnusedLocals`), not in a lint rule. Both can do it and one of them is already
  running and faster.
- **Naming and structure** in ESLint, because the compiler has no opinion.
- **Anything needing types** in ESLint with the project configured, and nowhere else.

The duplication to avoid is a rule that runs the same check in the linter and the compiler. It makes an error appear twice,
slows the pipeline, and it means a disagreement between the two is possible.

## The formatting argument, briefly

A formatter's value is that a pull request's diff contains only changes of meaning. That is worth more than any preference
about where a bracket goes, and it is the reason to adopt one and stop discussing it. Prettier's own choices are fine, and
the configuration is deliberately small: two options and an ignore file.

The one decision that matters is the line width, because it interacts with the code-block width convention in a
documentation repository and with the 90 character guidance for the lessons in this one. A formatter configured at 100 and
a convention at 90 produce a codebase that the tool will reflow, so the two numbers need to agree.

## Check yourself

Add the type-aware preset to a project, run the linter, and count the reports from `no-floating-promises` and
`no-unsafe-assignment`. Then decide which of the two you would fix first and why.
