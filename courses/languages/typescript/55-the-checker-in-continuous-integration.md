---
title: The checker in continuous integration
summary: The command that matters, where it goes in the pipeline, and the checks worth having beside it.
chapter: Testing and quality
minutes: 12
status: draft
---

## The one command

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

That is the check. It reads the project, reports the errors and writes nothing, so it has no output to manage and no
ordering to worry about relative to a build. Every other script in this lesson is a refinement.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

The order matters for one reason: `npm ci` installs from the lockfile, so a dependency that resolves differently on the
runner than on a developer machine is caught immediately. Pinning the compiler through the lockfile is what makes the
type check reproducible, which is the property that makes it worth trusting.

## A project with a bundler adds one line

```json
{
  "scripts": {
    "build": "tsc --noEmit && vite build"
  }
}
```

Putting the check inside the build script means the build cannot succeed with a type error, which is useful when a
deployment runs the build and nothing else. The alternative, a separate step in the pipeline, is better when the
pipeline reports per-step status, because a failure then names the check rather than the build.

What to avoid is a build script that runs the type check and a separate job that also does, because the same error is
reported twice and the slowest possible pipeline is the result.

## The checks worth having beside it

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:tests": "tsc --noEmit -p test/tsconfig.json",
    "typecheck:declarations": "tsc --noEmit -p test-d/tsconfig.json",
    "format:check": "prettier --check ."
  }
}
```

`typecheck:tests` exists because a project's main configuration often excludes the test directory, and the tests are where
a fake or a fixture is most likely to disagree with a type. A test file that is not type checked is a test whose types are
not tested.

`typecheck:declarations` is the declaration test from the publishing lesson: it compiles a file that imports the built
package by name, which is the only check that catches a declaration that does not match the output.

`format:check` is the version of the formatter that fails rather than writing, which is what the pipeline needs.

## The incremental build in the pipeline

```bash
npx tsc --build --verbose
```

For a project with references, `--build` skips a project whose inputs have not changed, using the build information file.
In a pipeline a cache is needed for that to help across runs:

```yaml
- uses: actions/cache@v4
  with:
    path: '**/*.tsbuildinfo'
    key: tsbuild-${{ hashFiles('**/tsconfig.json', '**/*.ts') }}
```

The key including the source hashes is the important part: a build information file that does not match its inputs
produces a run that skips a check it should have run, which is worse than a slow pipeline. When in doubt, delete the
cache, which is the first thing to try when a pipeline reports no errors on a branch that clearly has one.

## Hooks and the honest argument

```bash
npx husky init
```

A pre-commit hook that runs the type check catches an error before it reaches the pipeline, which saves a round trip. It
also adds a wait to every commit, and a project with a two minute type check finds that its developers start using
`--no-verify`, at which point the hook is doing nothing.

The arrangement I prefer: a fast hook that formats the staged files and runs the linter on them, and the type check in
the pipeline only, because the editor already reports the errors while the code is written. A hook that takes more than a
few seconds is a hook that gets bypassed.

## What the pipeline cannot do for you

- **It cannot stop a wrong type being written.** It reports one, which is different.
- **It cannot check data from outside.** The schema in the boundary lesson is the only thing that does.
- **It cannot check code it does not include.** A file outside `include` is not checked locally or in the pipeline, and
  the two agree with each other while both being wrong.
- **It cannot check a type assertion.** An `as` that says something false compiles everywhere.

The last two are worth a periodic audit: a grep for `as `, `any`, `@ts-expect-error` and `!` in a codebase, reviewed
once in a while, is a better measure of its type safety than the strict flags it has turned on. The flags narrow where a
mistake can hide; the assertions are where the guarantees are given back.

## Check yourself

Add `typecheck`, `lint` and `test` as separate steps to a pipeline and make the type check fail on purpose by breaking a
call site. Then add a file outside `include`, confirm both the editor and the pipeline miss it, and fix the configuration.
