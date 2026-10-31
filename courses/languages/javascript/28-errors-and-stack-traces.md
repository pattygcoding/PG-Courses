---
title: Errors and stack traces
summary: The error hierarchy, what throw does to any value, and how to read a trace that starts in a library.
chapter: Control flow, errors and regular expressions
minutes: 13
status: draft
---

## An error is an object you throw

```js
throw new Error('records must not be empty');
```

`throw` accepts any value, so `throw 'nope'` and `throw { code: 42 }` both work and both lose the stack trace and the
name. Throw an `Error` or a subclass of one, because that is what every tool expects and what gives a usable trace.

The built in types are worth knowing:

| Type | Thrown when |
| --- | --- |
| `Error` | the general case |
| `TypeError` | a value is not of the expected type |
| `RangeError` | a number is out of the allowed range, including stack depth |
| `ReferenceError` | a name does not exist |
| `SyntaxError` | parsing failed, in `JSON.parse` or `eval` |
| `URIError` | `decodeURIComponent` got malformed input |
| `AggregateError` | several failures together, from `Promise.any` |

All of them inherit from `Error`, so `error instanceof Error` distinguishes a failure from a thrown string.

## Reading a stack trace

```js
function inner() {
  throw new Error('boom');
}

function outer() {
  inner();
}

outer();
```

```text
Error: boom
    at inner (file:///app/report.js:2:9)
    at outer (file:///app/report.js:6:3)
    at file:///app/report.js:9:1
```

The first frame is where the error was created, `inner` on line 2. Reading down gives the call path that led there.
A frame in `node:internal` or inside a library is context rather than the bug, so find the first frame in your own
code and start there.

```text
    at async loadReport (file:///app/report.js:12:20)
```

A frame marked `async` is where an awaited call resumed, which is the useful marker when the trace spans several
promises.

## The cause

```js
try {
  JSON.parse(text);
} catch (error) {
  throw new Error('cannot parse the report', { cause: error });
}

console.log(error.cause);
```

The second argument to `Error` carries the original failure, and a logger that walks `cause` prints the whole chain.
Without it, the replacement error hides what actually went wrong, which is the most common way a useful trace becomes
a useless one.

```js
let current = error;

while (current) {
  console.log(current.message);
  current = current.cause;
}
```

## A custom error type

```js
class ValidationError extends Error {
  constructor(field, message, options) {
    super(message, options);
    this.name = 'ValidationError';
    this.field = field;
  }
}

try {
  throw new ValidationError('key', 'must not be empty');
} catch (error) {
  console.log(error.name, error.field, error instanceof ValidationError);
}
```

Extending `Error` works and needs two things: `name` set to the class name, because the inherited `name` is `'Error'`,
and the class name appearing in the trace. A field on the error is what a caller uses to react, and it saves parsing
the message.

```text
ValidationError: must not be empty
    at file:///app/validate.js:8:9
```

Setting `name` is what changes the first line of that trace, which is what you see in a log. Some environments also
need `Object.setPrototypeOf(this, ValidationError.prototype)` in a class that extends a built in, because of how older
transpiled classes handled the prototype; a current runtime does not need it.

## Errors from code you did not write

```js
try {
  await readFile(path, 'utf8');
} catch (error) {
  console.log(error.code);        // 'ENOENT'
  console.log(error.errno);
  console.log(error.path);
}
```

A Node system error carries `code`, `errno`, `syscall` and the path, which is far more useful than the message. Check
`error.code` rather than matching on the text, because the message is localised and can change between releases. A
fetch failure carries a `cause` holding the underlying network error for the same reason.

## Assertions

```js
function assert(condition, message) {
  if (!condition) {
    throw new Error(`assertion failed: ${message}`);
  }
}

assert(records.length > 0, 'records must not be empty');
```

There is no assertion statement in the language, so an assertion is a function that throws. Node ships one in
`node:assert` with `strictEqual`, `deepEqual` and `throws`, which is what the test runner uses.

## Check yourself

Throw an `Error` from a nested function and read the trace from the top down to find the line. Then catch a
`JSON.parse` failure, wrap it with a `cause`, and print the chain. Finish by catching a missing file and printing
`error.code` rather than the message.
