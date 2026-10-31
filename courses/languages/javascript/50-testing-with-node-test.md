---
title: Testing with node:test
summary: The runner that ships with the runtime, its assertions, and the commands that run one test.
chapter: Testing and quality
minutes: 13
status: draft
---

## The runner is built in

```js
// src/parse.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseLine } from './parse.js';

test('parses a key and a value', () => {
  assert.deepStrictEqual(parseLine('report.csv,128'), {
    key: 'report.csv',
    value: 128,
  });
});
```

```bash
node --test
```

```text
ok 1 - parses a key and a value
```

`node --test` finds files matching `*.test.js`, `*-test.js`, `test.js` and anything under a `test` directory, runs each
in its own process and reports the results. No dependency, no configuration and no framework, which is why a small
project needs nothing else.

## Assertions come from node:assert

```js
import assert from 'node:assert/strict';

assert.equal(value, 2);                      // ===
assert.deepStrictEqual(row, { key: 'a' });     // by structure
assert.ok(rows.length > 0, 'rows must not be empty');
assert.notEqual(value, 0);

assert.throws(() => parse('bad'), TypeError);
assert.throws(() => parse('bad'), /line 1/);     // matched against the message

await assert.rejects(() => load('missing.json'));
await assert.rejects(() => load('missing.json'), { code: 'ENOENT' });
await assert.doesNotReject(() => load('config.json'));
```

`node:assert/strict` makes `equal` strict, which is what you want; the default export from `node:assert` has a loose
`equal` that compares with `==`. `deepStrictEqual` is the one that compares structures, and it is what a test needs for
an object or an array.

`assert.rejects` is the one people forget. A rejected promise that nobody awaits is an unhandled rejection rather than a
failing assertion, so a test of an async function needs `await assert.rejects(...)` rather than a `try` with a comment.

## Grouping and lifecycle

```js
import { describe, it, before, beforeEach, after } from 'node:test';

describe('parseLine', () => {
  let context;

  before(() => {
    context = createContext();
  });

  after(() => {
    context.close();
  });

  beforeEach(() => {
    context.reset();
  });

  it('parses a value', () => {
    assert.equal(parseLine('a,1').value, 1);
  });
});
```

`describe` and `it` are aliases for `test` with a nesting concept, and they are the shape a reader expects from other
runners. `before` and `after` run once for the block, `beforeEach` and `afterEach` run around every test in it, and an
`it` inside a `describe` reports under that name.

```js
test('parses several shapes', async (t) => {
  await t.test('a two field line', () => {
    assert.equal(parseLine('a,1').key, 'a');
  });

  await t.test('a quoted field', () => {
    assert.equal(parseLine('"a,1",2').key, 'a,1');
  });
});
```

A subtest runs inside its own test and its failures are reported separately, which is how one test reports several
independent cases without stopping at the first failure.

## Running and filtering

```bash
node --test                          # every test file
node --test src/parse.test.js         # one file
node --test --test-name-pattern=parse # tests whose name matches
node --test --watch                   # rerun on change
node --test --test-reporter=spec        # a readable report instead of TAP
```

`--test-name-pattern` with `--watch` is the loop for a single failing test while working on it. The default report is
TAP, which is machine readable and unlovely; `--test-reporter=spec` prints the tree a person expects.

```bash
node --test --experimental-test-coverage
```

```text
# start of coverage report
# file           | line % | branch % | funcs % | uncovered lines
# ---------------------------------------------------------------
#   parse.mjs    |  92.31 |   85.71 |  100.00 | 42-44
#   parse.test.mjs | 100.00 |  100.00 |   80.00 |
# ---------------------------------------------------------------
# all files      |  94.12 |   88.89 |   94.74 |
# end of coverage report
```

The report names the uncovered lines, which is more useful than the percentage. It is flagged experimental in current
Node releases, so the command needs the flag for the moment.

## Tests that are not ready

```js
test.skip('needs a network connection', () => { });

test.todo('handles the quoted field case');

test('slow integration test', { timeout: 30_000 }, async () => {
  await startServer();
});
```

`skip` records that a test exists and is not running. `todo` records an intention and reports it as a todo rather than a
pass. Options are passed as the second argument, and `timeout` is the one worth setting on anything that waits for a
process, because there is no default and a hung test then hangs the run.

```js
test('parses one case', { only: true }, () => { });
```

```text
'only' and 'runOnly' require the --test-only command-line option.
```

The `only` option does nothing unless the run is started with `--test-only`, which is deliberate: a test marked as the
only one cannot silently reduce a continuous integration run to one case. It is still a debugging tool worth removing
before a commit.

## Check yourself

Write a test file with three assertions including a `deepStrictEqual` and an `assert.rejects`, run it with
`node --test`, and read the report. Then run one test by name with `--test-name-pattern`, and run the coverage report.
