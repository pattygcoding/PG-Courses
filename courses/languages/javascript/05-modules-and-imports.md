---
title: Modules and imports
summary: Named and default exports, live bindings, dynamic import, and how a module is not the same as a script.
chapter: Getting started
minutes: 13
status: draft
---

## A module exports and imports

```js
// src/record.js
export const EMPTY = { key: '', value: 0 };

export function parseRecord(line) {
  const [key, value] = line.split(',');
  return { key: key.trim(), value: Number(value) };
}

export default function formatRecord(record) {
  return `${record.key}: ${record.value}`;
}
```

```js
// src/report.js
import formatRecord, { parseRecord, EMPTY } from './record.js';

console.log(formatRecord(parseRecord('a, 1')));
```

```bash
node src/report.js
```

```text
a: 1
```

Named exports are imported by name and default exports are the one thing a module exports when it has a single
purpose. A file with both is common and a file with a default export called `index` is the pattern that wastes
the most time, because nothing tells a reader what it is.

`import * as record from './record.js'` collects the whole namespace into an object, which is worth it when a
module has more than a handful of names.

## Bindings are live, values are not copied

```js
// src/counter.js
export let count = 0;

export function increment() {
  count += 1;
}
```

```js
import { count, increment } from './counter.js';

console.log(count);   // 0
increment();
console.log(count);   // 1
```

The imported `count` is a binding into the exporting module, not a copy of its value, so it changes when the
module changes it. That also means an import cannot be assigned to: `count = 5` in the importing file is an
error, because the binding belongs to the other module.

This is the reason a cyclic import can work at all, and the reason it can also hand you an uninitialised value:

```text
ReferenceError: Cannot access 'EMPTY' before initialization
```

Two modules importing each other get one partially evaluated module, and the binding is in its temporal dead
zone until the declaration runs. Cycles are usually a sign that a shared module wants to exist.

## `import()` is a function

```js
const { parseRecord } = await import('./record.js');
```

A dynamic import returns a promise and can appear anywhere, which is how a heavy module is loaded only when it
is needed:

```js
async function loadParser(format) {
  if (format === 'csv') {
    return import('./parsers/csv.js');
  }

  return import('./parsers/json.js');
}
```

The static form is resolved before the program runs, so the bundler can include it. The dynamic form is resolved
when it runs, so it can be conditional, and in a browser it means a network request at that moment.

## Top level await

```js
// src/report.js
const config = await import('./config.json', { with: { type: 'json' } });

console.log(config.default.batchSize);
```

A module may await at the top level, and an importing module waits for it. That removes the wrapping function
people used to write around a startup path, and it works in Node and in browsers. It is the reason a module
that reads its configuration at load time can do so in one readable line.

## A module is not a script

| | Script | Module |
| --- | --- | --- |
| Scope | global | its own file |
| Variables | `var` leaks out | never |
| Strict mode | opt in | always |
| Top level `await` | no | yes |
| Re-evaluated | on every script tag | once, then cached |

A module runs once per process, however many times it is imported, which is what makes a module level singleton
work and what makes its state survive between two files that import it.

## Paths are real paths in Node

```js
import { parseRecord } from './record.js';        // the extension is required
import { parseRecord } from '/src/record.js';      // absolute from the file system root
import { parseRecord } from 'csv-report';          // a package in node_modules
import { readFile } from 'node:fs/promises';       // a built in, with the node: prefix
```

Node does not guess an extension or look for an `index.js` for a relative import, so `'./record'` fails where
`'./record.js'` works. The `node:` prefix marks a built in module and cannot be shadowed by an installed
package with the same name, which is worth using in library code.

## CommonJS still exists

```js
const { parseRecord } = require('./record.cjs');
```

```js
import record from './legacy.cjs';       // module.exports becomes the default
```

CommonJS uses `require` and `module.exports`, has no top level await and loads synchronously. An ES module can
import it, and the named imports usually work because the loader reads the exports statically. A CommonJS module
cannot `require` an ES module.

The way to tell which a file is: a `.mjs` file is a module, a `.cjs` file is CommonJS, and a `.js` file is
whichever the nearest `package.json` says through its `type` field. Set `"type": "module"` in a new project and
name the exceptions `.cjs`.

## Check yourself

Split one file into two modules with a named export and a default export, run it, and confirm the live binding
by exporting a counter and incrementing it from another module. Then load one of the modules with a dynamic
`import()` inside a condition and print the namespace.
