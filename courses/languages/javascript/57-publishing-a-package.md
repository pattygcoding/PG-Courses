---
title: Publishing a package
summary: The fields a release needs, what a version bump means, and the check to run before pushing.
chapter: Security and shipping
minutes: 12
status: draft
---

## The fields a package needs

```json
{
  "name": "csv-records",
  "version": "0.4.0",
  "description": "Parse and summarise CSV records",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./parse": "./dist/parse.js"
  },
  "files": ["dist"],
  "engines": { "node": ">=20" },
  "sideEffects": false
}
```

| Field | Effect |
| --- | --- |
| `exports` | the entry points, and the only ones reachable |
| `files` | what is included, an allow list |
| `sideEffects` | lets a bundler drop an unused module |
| `engines` | documents the Node versions supported |
| `types` | where a TypeScript consumer finds the declarations |

`exports` replaced `main` as the real entry map. Once it is present, a deep import such as
`csv-records/dist/parse.js` is refused, which is what a published package wants: the surface is what the map says it is.
The `types` condition has to come first in each entry, because the first matching condition wins.

## What the package contains

```bash
npm publish --dry-run
npm pack --dry-run
```

```text
npm notice Tarball Contents
npm notice 4.1kB dist/index.js
npm notice 1.2kB dist/index.d.ts
npm notice 1.8kB package.json
npm notice 512B README.md
```

`npm pack --dry-run` lists the files and the size without publishing anything. Every unintended file in that list is a
thing that could have been shipped: a test, a fixture, a secret in a stray `.env`. The `files` allow list is what keeps
the list short, and `.npmignore` is the deny list alternative, which is easier to get wrong.

```bash
npm pack
```

That writes the tarball locally, and unpacking it and running the tests against the packed copy is the last check. A
package that only works from the repository it was built in is a package whose `files` list is wrong.

## What a version bump means

| Change | Version |
| --- | --- |
| A bug fix, no API change | patch |
| A new function, a new export | minor |
| A removed export, a changed signature, a changed default | major |

Below 1.0 the convention is that a minor bump may break, which is why a caret range from `0.4.0` does not accept
`0.5.0`. That is a real constraint for a consumer, and it is the reason a library used in production usually reaches 1.0
earlier than the author feels ready for.

Adding an optional parameter is a minor change. Changing the order of two parameters is a major one, and so is narrowing
what a function accepts. Removing an export is major even when nothing in the repository used it, because a consumer
outside the repository might have.

## Pre-release versions

```bash
npm publish --tag next
```

```json
{ "version": "1.0.0-rc.1" }
```

A version with a suffix is a pre-release and is not selected by a normal range. The `--tag` puts it under a tag other
than `latest`, so `npm install csv-records@next` gets it and everyone else is unaffected. That is how a release candidate
is tested by real consumers before it becomes the default.

## What cannot be undone

```bash
npm unpublish csv-records@0.4.0 --force
npm deprecate csv-records@0.4.0 "use 0.4.1"
```

An unpublished package name is blocked for 24 hours, and a version that other packages depend on cannot be unpublished
at all. The practical answer to a broken release is a patch version that fixes it plus a `deprecate` message on the
broken one, because a deprecation shows in an install and an unpublish does not.

That makes the pre-publish checks worth their minute: a fresh clone, `npm ci`, the tests, and a pack into a temporary
directory.

## Automating the release

```yaml
name: release
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm test
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

A publish triggered by a tag means the artifact was built from a commit that has a name, and the tests run on that exact
tree. `--provenance` attaches a signed record of which workflow and commit produced the package, which a consumer can
check. The token belongs in a repository secret and never in a file.

## Check yourself

Add an `exports` map and a `files` list to a project, then run `npm pack --dry-run` and read the contents. Unpack the
tarball into a temporary directory, install it into a fresh project, and import it from the entry point and from a
subpath.
