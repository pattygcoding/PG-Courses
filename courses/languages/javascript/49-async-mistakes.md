---
title: Async mistakes
summary: The failures that leave no trace, the ordering that surprises, and the error that never reaches a catch.
chapter: Asynchronous JavaScript
minutes: 13
status: draft
---

## An unhandled rejection

```js
async function load() {
  throw new Error('failed');
}

load();
```

```text
UnhandledPromiseRejection: Error: failed
```

Nothing waited for the promise, so the failure had nowhere to go. A rejection with no handler is reported once at the
end of the turn, and the details of what led to it are not there. Every promise needs either an `await` inside a `try`
or a `.catch`:

```js
try {
  await load();
} catch (error) {
  console.error('failed to load', error);
}
```

A `catch` that only logs and continues hides the failure every bit as thoroughly, which is the other end of the same
problem. Decide at each handler whether the failure is recoverable, and rethrow or exit if it is not.

## A throw in a callback the runtime calls

```js
try {
  setTimeout(() => {
    throw new Error('boom');
  }, 10);
} catch (error) {
  console.error('never runs');
}
```

The callback runs on a later turn, so the `try` has already finished and there is no `catch` on the stack. A listener, a
stream handler and an unawaited promise are the same. Each one needs its own handling, and a `try` around the
registration catches only a synchronous failure from the registration itself.

## The async forEach that does not wait

```js
files.forEach(async (file) => {
  await write(file);
});

console.log('done');            // prints before any file is written
```

`forEach` calls the callback and ignores what it returns, so the promises are started and nothing waits. Everything
after the loop runs early, and any error inside is an unhandled rejection. Use a loop that awaits:

```js
for (const file of files) {
  await write(file);
}
```

`map` has the same issue in reverse: it collects the promises and returns them, which is useful rather than wrong.

```js
await Promise.all(files.map((file) => write(file)));
```

That is the parallel version, and it is the one to reach for when the writes are independent.

## await in a loop

```js
for (const url of urls) {
  results.push(await fetch(url).then((r) => r.json()));
}
```

Correct and serial, so a hundred requests take a hundred round trips. The parallel version is shorter and, for a hundred
independent requests, far faster:

```js
const results = await Promise.all(urls.map((url) => fetch(url).then((r) => r.json())));
```

Both are right in their place. The serial version suits requests that depend on each other, and the parallel version
suits independent ones. For a large list neither extreme is right, and the lesson on limiting concurrency covers the
middle ground.

## Returning a promise that is not awaited

```js
async function save(row) {
  database.write(row);            // not awaited, returns immediately
}
```

The function is async and returns a promise that resolves as soon as `database.write` is called, so a caller awaiting
`save` believes the write finished. A missing `await` inside an async function is invisible at the call site and appears
as data that goes missing under load.

```js
async function save(row) {
  await database.write(row);
}
```

A linter with `no-floating-promises` or `no-misused-promises` finds most of these, which is the argument for a type
checker even in a JavaScript project.

## Errors that arrive as anything

```js
try {
  await doWork();
} catch (error) {
  console.log(error.missingField);       // TypeError inside the handler
}
```

A rejected promise can carry anything as its reason: an `Error`, a string, a response object, `undefined`. Reading a
property from it inside the handler throws a second error, which replaces the first. Handle the shape defensively:

```js
catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
}
```

That belongs in a shared error handler. An `AbortError`, a `TimeoutError` and a `TypeError` from a `fetch` all arrive
through the same `catch`, and code that assumes `error.response` exists fails on the first one.

## Awaiting something that is not a promise

```js
const value = await 42;

console.log(value);         // 42
```

`await` wraps a non-promise, which is convenient and hides a mistake: awaiting a function that returns a plain value
costs a microtask turn and suggests the value is asynchronous when it is not. The same confusion appears in a `forEach`
over an array of promises, where one of the two callbacks is doing nothing.

## A promise that never settles

```js
function waitFor(condition) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (condition()) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
}
```

If the condition never becomes true, the promise never settles, the interval runs for the life of the process and
anything awaiting it waits for ever. An unbounded wait needs a deadline and a cleanup:

```js
function waitFor(condition, timeoutMs) {
  return Promise.race([waitFor(condition), rejectAfter(timeoutMs)]);
}
```

The version above also clears its interval, which the first draft did not: a `setInterval` inside a promise that is
abandoned is a leak that keeps a callback and everything it captured alive.

## A boolean flag as a guard

```js
let loading = false;

async function refresh() {
  if (loading) return;

  loading = true;
  await fetchAll();
  loading = false;
}
```

That guard works until a call interleaves with an early return or a throw, at which point `loading` stays true for ever
and every later call is a no-op. A promise is the better guard, because it settles exactly once and can be awaited:

```js
let inFlight;

function refresh() {
  inFlight ??= fetchAll().finally(() => {
    inFlight = undefined;
  });

  return inFlight;
}
```

The second caller gets the same promise rather than a second request, which is what a refresh button and a cache miss
both want. The `finally` is what guarantees the slot is cleared on a failure as well as on a success.

## Check yourself

Write a `forEach` with an async callback and show that the code after it runs first, then fix it two ways. Then write an
async function with a missing `await` and show what a caller sees, and write a promise that never settles and find out
what a test run does with it.
