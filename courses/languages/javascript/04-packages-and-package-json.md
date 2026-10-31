---
title: Packages and package.json
summary: Dependencies, version ranges, the lockfile, and the fields that decide how a project is used.
chapter: Getting started
minutes: 13
status: draft
---

## A project starts with a manifest

```json
{
  "name": "csv-report",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "engines": { "node": ">=20" },
  "scripts": {
    "start": "node src/report.js",
    "test": "node --test",
    "lint": "eslint ."
  },
  "devDependencies": {
    "eslint": "^9.15.0"
  }
}
```

`npm init -y` writes the skeleton, and every field above earns its place:

| Field | Effect |
| --- | --- |
| `type` | makes `.js` files ES modules rather than CommonJS |
| `private` | stops an accidental publish to the registry |
| `engines` | documents the Node version and warns when it is not met |
| `scripts` | names the commands everyone runs |
| `dependencies` | what the package needs at run time |
| `devDependencies` | what only the build and the tests need |

## Three kinds of dependency

```json
{
  "dependencies": { "pg": "^8.13.0" },
  "devDependencies": { "eslint": "^9.15.0" },
  "peerDependencies": { "react": ">=18" }
}
```

A `dependency` is installed when someone installs your package. A `devDependency` is installed for your own
development and is not installed by a consumer. A `peerDependency` says the consumer must supply it, which is
how a plugin declares the version of the thing it plugs into.

Putting a test runner in `dependencies` means every user downloads it, and putting a run time library in
`devDependencies` means the package breaks the moment it is used outside your own repository.

## Version ranges and the lockfile

```json
{
  "dependencies": { "pg": "^8.13.0" }
}
```

`^8.13.0` accepts any 8.x version at 8.13.0 or above, `~8.13.0` accepts 8.13.x, and `8.13.0` pins exactly one.
The caret is the default and it is why two developers can install different patch versions of the same tree.

`package-lock.json` records the exact version of every package in the tree, including transitive ones. Commit
it for an application, and use the command that respects it:

```bash
npm install          # updates the lock file when ranges allow
npm ci               # installs exactly what the lock file says
```

`npm ci` deletes `node_modules` and installs from the lock file, which is what continuous integration should
run. It is faster and it fails when the lock file and the manifest disagree, which is better than a build that
quietly resolves something else.

## Where packages come from

```bash
npm install pg                 # a dependency
npm install --save-dev eslint  # a dev dependency
npm install --save-exact pg    # writes 8.13.0
npx eslint --version           # run a one-off without installing it
```

`npx` downloads a package into a cache, runs it and leaves it there, which is how a formatting or scaffolding
tool is used once without becoming a dependency. A tool used by everyone every day belongs in
`devDependencies` so the version is pinned and the command is in `scripts`.

`node_modules` is where the tree lives, and a package can have its own nested copy of a dependency when two
packages need different major versions. That is why the directory can be large. Deleting it and running
`npm ci` is the standard first response to a resolution that looks wrong.

## Reducing what you install

Every dependency is code you did not read, a supply chain risk and a thing that has to be updated. Before
adding one, check whether the platform has it: `fetch`, `URL`, `structuredClone`, `AbortSignal`, `Intl` and a
test runner all ship with Node.

```bash
npm audit
npm outdated
```

`npm audit` reports advisories against the installed tree and `npm outdated` lists what is behind. Both belong
in a scheduled job, because an advisory is published against code that has not changed.

## Check yourself

Create a project, add a `type` field, a `test` script and one dev dependency. Run `npm ci` twice and confirm the
second run uses the lock file, then change a range in the manifest and watch `npm ci` refuse.
