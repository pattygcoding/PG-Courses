---
title: Versions and support
summary: Yearly editions, the stage process behind them, and how to find out whether the runtime you target has a feature.
chapter: Getting started
minutes: 12
status: draft
---

## Editions are named by year

ECMAScript 2015 was the last one with a number people remember, which is why it is called ES6. Since then the
language has shipped an edition every year, named for the year: ES2016, ES2017 and so on to ES2025. A feature
that arrives between editions is described by name, such as `Array.prototype.toSorted`, rather than by a
version number.

Nothing is removed. The language only grows, so a script written in 2015 still runs, and the interesting
question is which of the newer features your target supports.

## The stage process

A proposal moves through four stages before it is in an edition:

| Stage | Means |
| --- | --- |
| 0 | an idea someone is discussing |
| 1 | a champion and a problem statement |
| 2 | a design the committee expects to standardise |
| 3 | a complete specification, awaiting implementations |
| 4 | in the next edition, shipping in engines |

A stage 3 feature is finished on paper and may already work in one engine behind a flag. Shipping one in
production code means a polyfill, and a polyfill for syntax is not possible, which is where a transpiler
earns its place.

```js
// Is this real yet? Ask the runtime.
console.log(typeof Array.prototype.toSorted, typeof Temporal);
```

```text
function undefined
```

Node 22 has `toSorted` and does not have `Temporal`, and that is what a feature check tells you in one line
rather than what a blog post told you two years ago. `Temporal` is the replacement for `Date` and is
implemented in some engines behind a flag, so code that needs real date arithmetic uses a library until it
ships everywhere.

## Runtime support is not language support

The same edition can be fully implemented in one engine and partly in another, so support is per feature and
per runtime:

- MDN has a compatibility table on every page.
- `node.green` and `caniuse.com` answer the same question for Node and browsers.
- `npx ecmascript-compat` checks a list of features against an engine's actual version.

A `TypeError: Promise.withResolvers is not a function` in production is the failure mode of assuming a feature
is present because it worked on your machine.

## Node release lines

Node ships a major release twice a year and promotes every even numbered major to long term support. The odd
numbered releases are for trying things and are not supported past a few months.

```json
{
  "engines": { "node": ">=20" },
  "packageManager": "npm@10.9.4"
}
```

An `engines` field documents the requirement and npm warns when it is not met. A `.nvmrc` file or the
`packageManager` field pins the version for a new machine, which is how a team avoids a build that works on one
laptop and not another.

## Transpiling and polyfilling are different jobs

```bash
npx esbuild src/report.js --bundle --target=es2020 --outfile=dist/report.js
```

A transpiler rewrites syntax, such as optional chaining or a class field, into something an older engine can
parse. A polyfill adds an API that is missing, such as a `Promise.withResolvers` function.

Neither is free. Transpiled output is longer and slower than the original, and a polyfill is code that runs on
every page load. For a Node service on a supported LTS, both are usually unnecessary, and the build step is
cost with no benefit.

## Check yourself

Print `process.version` and check three features you use against MDN's compatibility tables. Then run
`node --v8-options | grep harmony` and look for a staged feature that is behind a flag in your runtime.
