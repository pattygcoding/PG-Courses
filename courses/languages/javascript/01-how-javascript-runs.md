---
title: How JavaScript runs
summary: An engine compiles your script, a host provides the APIs, and one thread runs everything.
chapter: Getting started
minutes: 12
status: draft
---

## An engine reads the script

```js
// report.js
const records = [
  { key: 'a', value: 1 },
  { key: 'b', value: 2 },
];

const total = records.reduce((sum, record) => sum + record.value, 0);

console.log(`${records.length} records, ${total} total`);
```

```bash
node report.js
```

```text
2 records, 3 total
```

There is no build step between that file and its output. `node` parses the script, compiles it to bytecode and
starts running it, and a function called often enough gets compiled to machine code while the program runs.
V8 in Node and Chrome, SpiderMonkey in Firefox and JavaScriptCore in Safari all work this way, and the
difference shows up in benchmarks rather than in what the language means.

## The engine and the host are different things

```js
console.log(typeof Array, typeof JSON, typeof console, typeof process);
```

```text
function object object object
```

`Array`, `JSON`, `Math`, `Promise` and `Object` come from the language, which is ECMAScript. `console` comes
from the host, which is Node here and the browser there. `process` exists only in Node, `document` only in the
browser, and `fetch`, `setTimeout` and `URL` exist in both.

That distinction is the reason a script can work in Node and fail in a browser with an error about `process`,
and it is why this course keeps to the language and the standard library. The host APIs live in the React, Vue
and Express courses.

`globalThis` is the name for the global object in every host, and it is how a script checks what it is running
inside:

```js
if (typeof process !== 'undefined' && process.versions?.node) {
  console.log('running in Node');
}
```

## One thread, one call stack

JavaScript runs your code on one thread per global environment. A call either returns or throws, and until it does,
nothing else in that thread happens.

```js
const started = Date.now();

while (Date.now() - started < 500) {
  // busy for half a second
}

console.log('done');
```

That loop blocks everything. Timers fire late, network responses wait, and a server handling this in a request
handler stops answering every other request. The asynchronous half of this course exists so that waiting does
not mean blocking, and the lesson on the event loop explains the mechanism.

## Strict mode is the default in modules

```js
// a script, not a module
undeclared = 1;               // creates a global
```

```js
// a module
undeclared = 1;               // ReferenceError: undeclared is not defined
```

Modules and classes are strict without saying so, which turns an accidental global into an error. In an older
script you write `'use strict';` at the top to get the same behaviour. A new file should be a module, and
lesson five covers what that means.

## Where the errors come from

```text
file:///app/report.js:9
const total = records.reduce((sum, record) => sum + record.value, 0);
                                                              ^

TypeError: Cannot read properties of undefined (reading 'value')
    at file:///app/report.js:9:63
    at Array.reduce (<anonymous>)
    at file:///app/report.js:9:24
```

The stack lists the innermost frame first, so read it from the top down to find the line that failed and from
there down to the call that led to it. `Cannot read properties of undefined` names a value that was not what
the code expected, which is the single most common JavaScript error and usually a missing key or an argument
that arrived as `undefined`.

## Check yourself

Write the script above, run it with `node report.js`, and print `typeof` for four names you are not sure
about. Then busy-wait for a second in a script with a `setTimeout` of 100 milliseconds and see how late the
timer fires.
