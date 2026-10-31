---
title: The browser and Node
summary: One language, two hosts, and the list of APIs that exist in both.
chapter: Security and shipping
minutes: 12
status: draft
---

## The host supplies the rest

The language is the same everywhere. What differs is the platform around it, and the differences are large enough to plan
for:

| | Browser | Node |
| --- | --- | --- |
| Global object | `window`, `self` | `globalThis`, `global` |
| Modules | resolved by a bundler or a URL | resolved from disk and `node_modules` |
| File access | none, except through a picker | `node:fs` |
| Processes | none | `node:child_process` |
| Storage | `localStorage`, `indexedDB` | `node:fs`, a database |
| Entry point | a `<script>` tag or a module | `node file.js` |
| Environment | `import.meta.env` in a bundler | `process.env` |

`globalThis` is the one name that works in both, and it is how a library checks where it is:

```js
const isNode = typeof process !== 'undefined' && process.versions?.node !== undefined;
const isBrowser = typeof window !== 'undefined';
```

A feature check beats a host check where the feature is what matters:

```js
if (typeof structuredClone !== 'undefined') {
  return structuredClone(value);
}
```

## The APIs that exist in both

`fetch`, `URL`, `URLSearchParams`, `TextEncoder`, `TextDecoder`, `AbortController`, `AbortSignal`, `structuredClone`,
`crypto`, `Blob`, `FormData`, `Headers`, `Request`, `Response`, `WebSocket`, `EventTarget` and the Web Streams API are
all in current Node and in every current browser. That overlap grew over a decade and it is the reason a lot of code is
portable without a shim:

```js
const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
const rows = await response.json();
```

That snippet runs unchanged in both, which was not true before.

```js
const blob = new Blob(['hello']);
const buffer = await blob.arrayBuffer();
```

`Blob` and `arrayBuffer` mean the same work can be done on binary data without `Buffer` in one environment and
`Uint8Array` in the other. `Buffer` still exists and is still a `Uint8Array`, so code that takes a `Uint8Array` accepts
either.

## Where they still differ

```js
import { EventEmitter } from 'node:events';

class Worker extends EventEmitter {
  run() {
    this.emit('done', 42);
  }
}
```

Node's `EventEmitter` and the DOM's `EventTarget` are two event systems. Node has `EventTarget` too, so a new class can
extend that and be portable, at the cost of a slightly longer `addEventListener` spelling.

A Node readable stream and a Web `ReadableStream` were separate things, and Node now provides
`Readable.fromWeb` and `Readable.toWeb` to move between them. A library that has to work in both picks one and converts
at the boundary rather than exposing both.

## Conditional exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "browser": "./dist/browser.js",
      "node": "./dist/node.js",
      "default": "./dist/index.js"
    }
  }
}
```

The `browser` and `node` conditions let a bundler pick a different file per target. It is the supported way to have a
`node:fs` implementation and a `fetch` implementation behind one import, and it keeps the platform check out of the
source.

The condition order matters: the first match wins, so the specific ones come before `default`.

## A build step, or not

A browser cannot import a bare specifier such as `lodash` without help, and it cannot resolve an extension-less path in
the way Node's older resolver allowed. That is what a bundler is for, and Vite, esbuild and Rollup are the current
answers.

For a Node service, a bundler is usually unnecessary: `node` resolves modules itself, the source is the artifact, and a
stack trace names the file that exists. A build step is a cost, and the reason to pay it is a target that cannot run the
source, which is the browser.

## Testing code that assumes a host

```js
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<p id="target"></p>');

globalThis.document = dom.window.document;
globalThis.window = dom.window;
```

A test that needs a DOM uses `jsdom` or `happy-dom` to provide one. That is a real dependency and a real approximation:
the DOM is large, and a behaviour that depends on layout is not there at all.

The alternative, and the better habit, is to keep the DOM out of the logic. A function that takes a value and returns a
value is testable with no environment, and the part that reads from a `document` is a thin layer around it.

```js
export function formatRow(row) {
  return `${row.key}: ${row.value}`;
}

export function renderRow(element, row) {
  element.textContent = formatRow(row);
}
```

The first function has a dozen tests and no setup. The second has one test and a DOM.

## Writing something that runs in both

```js
export function createStore({ storage }) {
  return {
    get(key) {
      return storage.getItem(key);
    },
    set(key, value) {
      storage.setItem(key, value);
    },
  };
}
```

The platform-specific thing arrives as a parameter, so the code has no `process` or `localStorage` in it and the caller
decides. That is the plain dependency injection pattern applied to a platform API, and it is how a library stays testable
and portable at the same time.

## Check yourself

Run the `fetch` snippet in Node and in a browser console and confirm both work. Then find one API in a project that
exists in only one of the two and write down how the other environment would get it.
