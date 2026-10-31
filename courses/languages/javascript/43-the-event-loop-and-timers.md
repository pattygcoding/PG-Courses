---
title: The event loop and timers
summary: One thread, a queue of tasks, and the microtask queue that runs to empty before anything else.
chapter: Asynchronous JavaScript
minutes: 14
status: draft
---

## One thing at a time

```js
console.log('1 sync');

setTimeout(() => console.log('4 timer'), 0);

Promise.resolve().then(() => console.log('3 microtask'));

console.log('1b sync');
```

```text
1 sync
1b sync
3 microtask
4 timer
```

The whole script is the first task. It runs to completion, and only then does the runtime look at the queues. Two are
worth knowing:

| Queue | What arrives there |
| --- | --- |
| microtask | a promise callback, `queueMicrotask`, a continuation after `await` |
| macrotask | a timer, an I/O callback, an event from the host |

The rule is that the microtask queue is drained to empty before the next macrotask starts, including microtasks that
other microtasks add.

```js
Promise.resolve().then(() => {
  console.log('micro 1');
  Promise.resolve().then(() => console.log('micro 2'));
});

setTimeout(() => console.log('timer'), 0);
```

```text
micro 1
micro 2
timer
```

Both promise callbacks run before the timer, because the second was queued while the first was draining. That is how a
chain of resolved promises can delay a timer, and how a runaway loop of them can starve everything else.

## Timers are a request, not a promise

```js
const started = Date.now();

setTimeout(() => {
  console.log(`fired after about ${Date.now() - started} ms`);
}, 0);
```

A delay of zero does not mean immediately. It means "put this in the macrotask queue as soon as the timer is due",
which the runtime clamps to about a millisecond, and which is really an upper bound on lateness rather than a
schedule:

- A delay of 100 milliseconds fires when 100 milliseconds have passed and the thread is free, so a long synchronous
  task in front of it makes it late by as much as that task took.
- A nested `setTimeout` past five levels is clamped to a minimum of four milliseconds in browsers, to stop a timer loop
  spinning the CPU.
- `setInterval` does not catch up. If an iteration takes longer than the interval, the callbacks queue up or the
  runtime skips them, and the drift accumulates.

```js
let ticks = 0;

const handle = setInterval(() => {
  ticks += 1;

  if (ticks === 2) {
    clearInterval(handle);
  }
}, 5);
```

A repeating job that must not drift is scheduled from inside the callback with the next time computed from the clock,
rather than leaning on `setInterval`:

```js
function every(intervalMs, work) {
  let next = Date.now() + intervalMs;

  const tick = () => {
    work();
    next += intervalMs;
    setTimeout(tick, Math.max(0, next - Date.now()));
  };

  setTimeout(tick, intervalMs);
}
```

## A synchronous loop stops everything

```js
app.get('/report', (request, response) => {
  const rows = readAllRows();          // 300 ms of synchronous work
  response.json(rows);
});
```

While that handler runs, no timer fires, no request handler starts and no promise continuation resumes. A service with
one of those takes its latency for every concurrent caller, which is why "the event loop is blocked" is the diagnosis
behind a service whose requests all pause together.

The three ways out are to move the work off the main thread, which in Node means a worker or a child process, to call
an asynchronous version of the operation, or to break the work into chunks that yield:

```js
async function processInChunks(items) {
  for (let index = 0; index < items.length; index += 1) {
    process(items[index]);

    if (index % 100 === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
}
```

Awaiting a timer yields to the macrotask queue and lets other work in. Awaiting a resolved promise does not, because a
promise continuation is a microtask and microtasks run before the next timer.

## The phases in Node

Node's loop moves through a set of phases, and the two that matter for scheduling are the timer phase, where due
timers run, and the poll phase, where I/O callbacks run. `setImmediate` runs in the check phase, which is after the poll
phase of the current iteration, and it is the one to use for "after the current I/O work" rather than a zero delay.

```js
import { setImmediate } from 'node:timers';

setImmediate(() => console.log('after I/O'));
```

A zero delay and `setImmediate` are not interchangeable: from inside an I/O callback, `setImmediate` runs before a
timer, and from the main script the order depends on how long the process took to start. Use `setImmediate` when the
meaning is "next turn" and a timer only when a delay is genuinely wanted.

## Waiting for something is not a timer

```js
setTimeout(() => check(), 100);        // hoping the file is ready
```

A timer used as a guess about when something will be done is the source of tests that pass on a laptop and fail in
continuous integration. Wait for the thing itself:

```js
await once(emitter, 'ready');
```

That is the pattern to reach for: an event, a promise, a callback that the operation already provides, or a poll with a
bound if there is nothing else. `setTimeout` inside a test belongs in the small number of cases where the timer is the
thing under test.

## Check yourself

Predict the output of the four line example above, then run it. Add a promise chain inside the timer callback and
explain where its continuations land. Then time a zero delay with a long synchronous loop in front of it and measure
how late it fires.
