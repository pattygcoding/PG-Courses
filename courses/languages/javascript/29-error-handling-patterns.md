---
title: Error handling patterns
summary: What try, catch and finally promise, and the failures in this language that do not throw at all.
chapter: Control flow, errors and regular expressions
minutes: 14
status: draft
---

## The three clauses

```js
try {
  parse(input);
} catch (error) {
  console.error(error.message);
} finally {
  cleanup();
}
```

`catch` runs when anything is thrown in the `try`, including a value that is not an `Error`. `finally` runs on every
path, with or without an exception, and it is where a release happens. The binding is optional when the value is not
needed:

```js
try {
  parse(input);
} catch {
  console.error('input could not be parsed');
}
```

A `return` inside a `finally` replaces the return from the `try` and discards a thrown error, which is the reason to
keep a `finally` block free of control flow:

```js
function bad() {
  try {
    return 'from try';
  } finally {
    return 'from finally';         // the caller sees this
  }
}
```

## Catch only what you can handle

```js
try {
  const config = JSON.parse(text);
  return start(config);
} catch (error) {
  throw new Error('invalid configuration', { cause: error });
}
```

That `catch` swallows a failure from `start` as well, and reports it as a configuration problem. Narrow the `try` to
the operation you are handling:

```js
let config;

try {
  config = JSON.parse(text);
} catch (error) {
  throw new Error('invalid configuration', { cause: error });
}

return start(config);
```

A `try` block that wraps twenty lines is a `try` block whose errors you cannot name. One operation per `try`, and let
the rest propagate.

## Do not catch to log and rethrow

```js
try {
  load();
} catch (error) {
  console.error('failed', error);        // and then?
  throw error;
}
```

Every layer that does this logs the same failure, so one problem produces five lines and the earliest one is the
least useful. Log where the failure is handled and let it travel untouched through everything else. A correlation
identifier on each line is what makes the one line findable later.

## Some failures do not throw

```js
const response = await fetch('/api/rows/missing');

console.log(response.status);      // 404
console.log(response.ok);            // false
```

`fetch` rejects only for a network failure. A 404, a 500 and a redirect are all resolved promises, so code that
awaits a fetch inside a `try` and assumes the `catch` covers an error response is wrong. Check `response.ok` and throw
if the caller should not see it:

```js
if (!response.ok) {
  throw new Error(`request failed: ${response.status}`, { cause: response });
}
```

## Expected failures are values, not exceptions

```js
function parseSize(text) {
  const size = Number(text.trim());

  if (!Number.isFinite(size) || size < 0) {
    return null;
  }

  return size;
}

const size = parseSize(input);

if (size === null) {
  console.error('size must be a number');
}
```

A missing or malformed value in a file of a thousand lines is not exceptional, it is the common case, and throwing for
it means a `try` in the middle of a loop. Returning `null` or an object with a `ok` flag is the alternative:

```js
function parseSize(text) {
  const size = Number(text.trim());

  return Number.isFinite(size) && size >= 0
    ? { ok: true, value: size }
    : { ok: false, reason: `not a size: ${text}` };
}
```

The choice worth making deliberately: throw for a bug or an unrecoverable situation, return a value for a case the
caller expects to handle.

## A throw in a callback does not reach your try

```js
try {
  setTimeout(() => {
    throw new Error('boom');        // crashes the process, catch is not involved
  }, 10);
} catch (error) {
  console.error('never runs');
}
```

The callback runs on a later turn of the loop, long after the `try` block has finished, so there is no `catch` on the
stack. The same is true of a listener, a stream handler and an unawaited promise. Each of those needs its own
handling:

```js
function safe(fn) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      console.error('callback failed', error);
    }
  };
}

setTimeout(safe(() => {
  throw new Error('boom');
}), 10);
```

An unawaited promise that rejects is the same shape and worse, because the failure arrives as an
`unhandledRejection` event rather than as a crash. The async chapter covers it.

## Turning a callback API into a promise

```js
function load(path) {
  return new Promise((resolve, reject) => {
    readFile(path, (error, data) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(data);
    });
  });
}
```

That wrapper is the only reason to use the `new Promise` constructor in new code, and it is what makes the error
propagate through `await` and `try` like everything else. Once the callback form is wrapped, the rest of the program
has one error mechanism instead of two.

## One error type per layer

```js
class NotFoundError extends Error {
  constructor(resource, id, options) {
    super(`${resource} ${id} not found`, options);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}
```

A service throws a domain error, the HTTP layer maps it to a status code, and the parser throws its own type. Keeping
the translation in one place means the domain does not know about HTTP and the status codes are decided where all of
them are visible.

## Check yourself

Write a `try` that catches a `JSON.parse` failure and wraps it with a `cause`, then narrow the same `try` so a failure
from the next call is not misreported. Then throw inside a `setTimeout` and confirm the surrounding `catch` never runs.
