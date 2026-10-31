---
title: Promises
summary: A value that arrives later, the chaining that replaces callbacks, and the four combinators.
chapter: Asynchronous JavaScript
minutes: 14
status: draft
---

## Three states, settled once

```js
const ready = new Promise((resolve, reject) => {
  setTimeout(() => resolve('done'), 10);
});

ready.then((value) => console.log(value));
```

A promise is pending, then fulfilled with a value or rejected with a reason, and once it settles it never changes. The
executor function runs immediately and synchronously, which is why a promise is a container for an operation that has
already started rather than a way to start one.

```js
console.log('before');

new Promise((resolve) => {
  console.log('inside');
  resolve();
});

console.log('after');
```

```text
before
inside
after
```

That ordering surprises people exactly once, and it matters because a synchronous throw inside the executor rejects the
promise rather than propagating.

## then returns a new promise

```js
Promise.resolve(1)
  .then((value) => value + 1)
  .then((value) => console.log(value));       // 2
```

Each `then` returns a new promise, which is what allows the chain. What the callback returns decides the next state:

| Returned | The next promise |
| --- | --- |
| a value | fulfilled with it |
| a promise | waits for that promise and adopts its state |
| a thrown error | rejected with it |

That last row is why a `throw` inside a `then` behaves like a rejection, and it is what makes `async` functions
composable: a returned promise is awaited, not wrapped.

```js
Promise.resolve()
  .then(() => {
    throw new Error('in then');
  })
  .catch((error) => console.log(error.message));       // 'in then'
```

## catch and finally

```js
load()
  .then((data) => parse(data))
  .catch((error) => console.error('failed', error.message))
  .finally(() => console.log('attempt finished'));
```

`catch` is `then(undefined, onRejected)`, so it handles a rejection from anything above it in the chain and passes a
value through. `finally` runs on both paths, does not change the outcome, and is where a spinner is hidden or a
connection released. It is not a place to swallow a failure, because returning a value from it is ignored.

```js
load().catch(onFailure);          // and nothing handles a failure from onFailure
```

A `catch` at the end of a chain handles everything above it and nothing below it, which is why the last line of a chain
often needs one more handler or an `await` inside a `try`.

## The four combinators

```js
await Promise.all([fetchA(), fetchB()]);            // both, in order, fails fast
await Promise.allSettled([fetchA(), fetchB()]);      // both, whatever happened
await Promise.race([fetchA(), timeout(1000)]);        // the first to settle
await Promise.any([mirrorA(), mirrorB()]);            // the first to succeed
```

| Method | Settles with | On a failure |
| --- | --- | --- |
| `all` | an array of results in the input order | rejects with the first failure |
| `allSettled` | an array of `{ status, value }` or `{ status, reason }` | never rejects |
| `race` | the first settled value | rejects if the first to settle rejected |
| `any` | the first fulfilled value | rejects with an `AggregateError` |

```js
const [rows, users] = await Promise.all([fetchRows(), fetchUsers()]);
```

Two requests started together finish in the time of the slower one rather than the sum, which is the point. The order of
the results matches the order of the input array, not the order they finished in.

```js
const results = await Promise.allSettled([fetchRows(), fetchUsers()]);
const failed = results.filter((result) => result.status === 'rejected');
```

`allSettled` is what a report over several sources wants, because one source being down should not lose the others.
`all` is for the case where a failure means the whole operation is pointless.

`any` is for redundancy against several mirrors, and its failure is an `AggregateError` holding every reason:

```text
AggregateError: All promises were rejected
```

## Promise.withResolvers

```js
const { promise, resolve, reject } = Promise.withResolvers();

setTimeout(() => resolve('done'), 10);

console.log(await promise);
```

That replaces the executor-with-two-saved-callbacks pattern, which was the reason to use the `new Promise` constructor
outside of wrapping an old callback API. The three names come out together and the promise is settled by whichever one
is called first.

## Sequential and parallel are a choice

```js
for (const url of urls) {
  await fetch(url);                  // one at a time
}

await Promise.all(urls.map(fetch));   // all at once
```

The first is right when the second request depends on the first, or when the server would rather not receive ten
requests at once. The second is right when they are independent. `await` inside a loop is the most common performance
bug in asynchronous code, and it is invisible because the code looks the same either way.

## What not to do with a promise

```js
return new Promise((resolve) => resolve(fetchData()));
```

Wrapping a promise in a promise adds a turn and a layer for nothing. Return it, or await it.

```js
const never = new Promise(() => {});
```

A promise that is never settled keeps everything it captured alive for the life of the process, and anything awaiting it
waits forever. That is the shape of a hang that no timeout catches.

```js
startJob();
```

A promise whose result nobody reads is a floating promise, and if it rejects the failure surfaces as an
`unhandledRejection` event with no context. Either await it, or attach a `catch` that does something.

## Check yourself

Chain three `then` calls, throw in the middle, and handle it at the end. Then fetch two things with `Promise.all` and
again sequentially, and time both. Finish by reading the status of each result from `allSettled` when one of the two
fails.
