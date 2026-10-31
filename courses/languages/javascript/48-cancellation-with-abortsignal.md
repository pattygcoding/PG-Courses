---
title: Cancellation with AbortSignal
summary: One object that answers whether to stop, and the timeouts and compositions built on it.
chapter: Asynchronous JavaScript
minutes: 13
status: draft
---

## A controller and a signal

```js
const controller = new AbortController();

const work = fetch('/api/rows', { signal: controller.signal });

controller.abort();
```

```text
DOMException: The operation was aborted
```

`AbortController` has one method and one property: `abort()` and `signal`. The signal is passed to anything that
supports it, and aborting it makes those operations stop and reject with a `DOMException` whose `name` is
`'AbortError'`.

```js
console.log(controller.signal.aborted);          // true after abort
console.log(controller.signal.reason?.name);      // 'AbortError'
```

## A timeout is a signal

```js
const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
```

One line replaces the `setTimeout` and `clearTimeout` pair that used to surround a request, and the failure it produces
has a distinguishing name:

```text
TimeoutError
```

That is worth checking rather than assuming, because a timeout and a cancellation both arrive as a rejected promise and
a caller usually wants to treat them differently:

```js
try {
  return await fetch(url, { signal: AbortSignal.timeout(5_000) });
} catch (error) {
  if (error.name === 'TimeoutError') {
    throw new Error(`request to ${url} timed out`, { cause: error });
  }

  throw error;
}
```

## Combining signals

```js
const controller = new AbortController();

const signal = AbortSignal.any([
  controller.signal,
  AbortSignal.timeout(30_000),
]);

await fetch(url, { signal });
```

`AbortSignal.any` aborts when the first of its inputs does, with that one's reason, so a user cancellation and a
timeout can share the same code path. It is how a long running request is bounded by a global deadline while still
being abandonable by the caller.

## A signal has to be passed down

```js
async function loadAll(urls, signal) {
  const results = [];

  for (const url of urls) {
    if (signal?.aborted) {
      throw signal.reason;
    }

    results.push(await fetch(url, { signal }));
  }

  return results;
}
```

Cancellation is cooperative: nothing stops a function from the outside unless the function checks. A parameter typed as
an optional signal and passed to everything inside is the convention, and `signal.throwIfAborted()` is the short form of
the check when the reason should be thrown as it is.

```js
signal.throwIfAborted();
```

## Listening for the abort

```js
const controller = new AbortController();

await new Promise((resolve, reject) => {
  const connection = open();

  controller.signal.addEventListener('abort', () => {
    connection.close();
    reject(controller.signal.reason);
  }, { once: true });

  connection.onDone(resolve);
});
```

The `abort` event is where cleanup belongs, and the `once` option removes the listener after it runs. Passing the signal
to `addEventListener` does that automatically and also removes the listener when the signal aborts, which is how a
listener on a long lived object avoids outliving its owner:

```js
element.addEventListener('click', onClick, { signal });
```

That pattern is worth remembering, because a listener that is never removed is the most common memory leak in
JavaScript and the signal makes the removal automatic.

## Cancelling a group of operations

```js
const controller = new AbortController();

const requests = urls.map((url) => fetch(url, { signal: controller.signal }));

try {
  return await Promise.all(requests);
} finally {
  controller.abort();
}
```

One controller covers every request, and the `finally` guarantees they are cancelled whatever happened. Aborting an
already settled request does nothing, so the `finally` is safe on the success path too.

## What cancelling does not do

```js
const controller = new AbortController();

Promise.race([longWork(), timeout(100)]);

controller.abort();
```

`Promise.race` stops the caller waiting and leaves `longWork` running. The work continues until it checks something or
finishes, and its result is discarded. That is the difference between abandoning a result and stopping the work, and it
is why passing a signal down is the answer where the resource matters.

The other limit is that a signal cannot interrupt a synchronous loop. A `while` loop that runs for three seconds
ignores a signal until it ends, because nothing in the loop is a point at which the language can run the abort event.
A long loop that has to be interruptible checks the flag and yields:

```js
for (const item of items) {
  if (signal.aborted) {
    throw signal.reason;
  }

  process(item);
}
```

## Cancelling on a lifecycle boundary

```js
const controller = new AbortController();

onUnmount(() => controller.abort());

fetch('/api/rows', { signal: controller.signal }).then(render);
```

A component, a request handler or a test with a lifetime creates a controller and aborts it when that lifetime ends.
Every request started inside it is cancelled at once, which is what stops a response arriving after the thing that
wanted it has gone.

## Check yourself

Cancel a `fetch` with a controller and read the error name. Then bound the same call with `AbortSignal.timeout`, compare
the name, and combine both with `AbortSignal.any` and confirm which reason arrives when the timeout wins.
