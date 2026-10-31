---
title: Debugging
summary: Breakpoints, conditional logging, and the console methods that show a structure rather than a line of text.
chapter: Control flow, errors and regular expressions
minutes: 12
status: draft
---

## The console is bigger than log

```js
console.table(records);
console.dir({ nested: { deep: true } }, { depth: null });
console.group('loading');
console.log('reading file');
console.groupEnd();
console.time('parse');
parse(text);
console.timeEnd('parse');
```

`table` prints an array of objects as a table with the keys as columns, which is the fastest way to see the shape of
data. `dir` with `depth: null` prints a nested object without truncation. `time` and `timeEnd` measure a section
without a stopwatch.

```js
console.log({ key, value });
```

Logging an object of the variables rather than a sentence is the small habit that pays: the names appear in the
output, so the line explains itself and the values keep their types in the console, where a click expands them.
Template strings turn a `Map` into `'[object Map]'`.

## The console methods that are not log

| Method | Prints at |
| --- | --- |
| `log` | standard output |
| `info` | standard output |
| `debug` | standard output, filtered by level in a browser |
| `warn` | standard error in Node |
| `error` | standard error in Node |
| `assert` | standard error, only when the first argument is falsy |

```js
console.assert(records.length > 0, 'no records', { records });
```

`console.assert` is easy to leave in a file and prints nothing in the normal case, which makes it a reasonable
alternative to a comment that claims an invariant.

## Breakpoints beat logging

```js
debugger;
```

A `debugger` statement does nothing until a debugger is attached, and then it stops there. With `node --inspect-brk`
and a browser or editor attached, the useful features beyond a breakpoint are a conditional expression on one, a log
point that prints without stopping, and the scope panel that shows the closure variables a logged line cannot reach.

```bash
node --inspect-brk report.js
```

Then `chrome://inspect` in a Chromium browser, or the editor's attach command. A conditional breakpoint in a loop over
ten thousand records is the difference between five stops and ten thousand.

## Errors from a tool that reports the wrong line

```text
TypeError: Cannot read properties of undefined (reading 'key')
    at render (file:///app/dist/bundle.js:1:48213)
```

A bundled or transpiled file has different line numbers, and a source map is what connects them to the original
source. A build tool emits one, and the debugger and `--enable-source-maps` in Node read it:

```bash
node --enable-source-maps dist/bundle.js
```

Without source maps, working backwards from a minified position is not practical, and the practical answer is to debug
the source through the build tool's own dev mode.

## Reproduce with the smallest input

The single most effective debugging step is shrinking the failing case. A record that reproduces the bug in three
fields, with the other ninety removed, usually shows the cause. Two tools make it routine:

- A test file with the minimal input, which also stops the bug returning.
- A binary search over the input: halve the data, keep the half that still fails, repeat.

## Read the value, not the name

A variable called `config` holding `undefined` is the bug. The reason is usually one of four:

| Symptom | Usual cause |
| --- | --- |
| A property is `undefined` | the key is different, or the object is from a different shape than expected |
| A function is not a function | the wrong import, or a default export used as a named one |
| An array is empty | a filter that excluded everything, or an awaited value that is a promise |
| `[object Object]` in a string | a template literal interpolating an object |

The fourth is worth its own line: `[object Object]` means a value was interpolated into a template literal and its
default conversion was used. `JSON.stringify(value)` or `console.log(value)` shows what it holds.

## Check yourself

Take a function that fails on some input, add a `debugger` and a conditional breakpoint, and step through it. Then log
the variables as an object rather than in a sentence, and shrink the failing input until only the cause is left.
