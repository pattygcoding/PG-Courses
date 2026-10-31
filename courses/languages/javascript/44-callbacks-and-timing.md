---
title: Callbacks and timing
summary: The error-first convention, debounce and throttle, and the timers that keep a process alive.
chapter: Asynchronous JavaScript
minutes: 13
status: draft
---

## The error-first callback

```js
function load(path, callback) {
  readFile(path, (error, data) => {
    if (error) {
      callback(error);
      return;
    }

    callback(null, data);
  });
}
```

A Node callback takes the error first and the result second, and the caller checks the error before using the result.
The pattern is old and still everywhere in the standard library, so reading it matters even if new code returns
promises.

```js
load('report.csv', (error, data) => {
  if (error) {
    console.error('failed', error.message);
    return;
  }

  parse(data);
});
```

The early return after the error is what keeps the rest of the function from running with a missing value. Without it,
the failure path falls through into the success path, which is the bug in most callback code that has one.

## Debounce

```js
function debounce(fn, waitMs) {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

const onSearch = debounce((text) => search(text), 250);
```

Every call cancels the pending one, so the function runs once after the calls stop. That is what a search box wants: a
request per pause rather than a request per keystroke.

The version worth writing for anything real also exposes the cancel and handles the arguments it last saw:

```js
function debounce(fn, waitMs) {
  let timer;
  let lastArgs;

  const run = () => {
    timer = undefined;
    fn(...lastArgs);
  };

  const debounced = (...args) => {
    lastArgs = args;
    clearTimeout(timer);
    timer = setTimeout(run, waitMs);
  };

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
```

## Throttle

```js
function throttle(fn, intervalMs) {
  let last = 0;

  return (...args) => {
    const now = Date.now();

    if (now - last >= intervalMs) {
      last = now;
      fn(...args);
    }
  };
}
```

Debounce waits for quiet; throttle runs at most once per interval and never delays the first call. A resize handler or
a scroll handler wants throttle, because it needs an update while the event continues, and a search box wants debounce.

```js
window.addEventListener('scroll', throttle(() => updatePosition(), 100));
```

The trailing-edge variant, which also runs once after the events stop, is the one most UI code wants. It is a dozen
more lines, which is why the implementation comes from a small library rather than from each project.

## Clearing what you scheduled

```js
const handle = setTimeout(() => console.log('late'), 5_000);

clearTimeout(handle);
```

A timer that is never cleared keeps its callback and everything it captures alive until it fires, and keeps the process
alive too. In a component or an object with a lifetime, clearing in the cleanup path is the difference between a tidy
shutdown and a leak:

```js
onUnmount(() => clearTimeout(handle));
```

In Node, a timer holds the event loop open. `unref` tells the runtime not to count it:

```js
import { setTimeout } from 'node:timers';

const poll = setTimeout(() => {}, 60_000);
poll.unref();
```

That matters for a heartbeat or a cleanup timer that should not stop a script from exiting when its real work is done.

## Timing guarantees

```js
setTimeout(() => console.log('a'), 0);
setTimeout(() => console.log('b'), 0);
```

Two timers with the same delay fire in the order they were scheduled. That is the one ordering promise the runtime
makes, and it is what makes a queue of timers deterministic in a test.

Everything else about the timing is approximate. A delay is a minimum, the callback runs when the thread is free, and
a long synchronous task in front of it makes every timer behind it late by the same amount.

## Sleeping in a promise

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await sleep(250);
```

That is the one line that wraps a timer in a promise, and it is worth having once in a project rather than in five
files. It yields to the macrotask queue, so it lets timers and I/O callbacks run, which makes it the right tool for
deliberately giving up the thread in a chunked loop.

The wrong use is a sleep as a substitute for waiting for something. A test that sleeps for a second to let a
background job finish passes until the machine is loaded, and then fails intermittently. Wait on the work: an event, a
promise, or a poll with a bound and a failure.

## Check yourself

Write `debounce` and `throttle` and call each from a loop of ten calls, printing when the function actually runs. Then
schedule a timer and clear it, and in Node schedule one and call `unref` to see the process exit without waiting.
