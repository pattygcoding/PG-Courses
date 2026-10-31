---
title: Performance and profiling
summary: Measuring something that is real, reading a CPU profile, and the object shapes that cost the most.
chapter: Testing and quality
minutes: 13
status: draft
---

## Measure, then change

```js
const time = (label, work) => {
  const started = performance.now();
  work();
  console.log(label, `${(performance.now() - started).toFixed(2)} ms`);
};

for (let index = 0; index < 3; index += 1) {
  time('warmup', work);        // let the JIT see the code first
}

time('measured', work);
```

A single timing of a cold function measures the interpreter and the compiler, not the code. Run the work a few times
first, measure more than once, and treat a difference under about ten percent as noise. `performance.now()` is a
monotonic clock, so it is not affected by a system clock change, and it has sub-millisecond resolution.

```js
import { hrtime } from 'node:process';

const started = hrtime.bigint();
work();
const elapsedNs = Number(hrtime.bigint() - started);
```

`process.hrtime.bigint()` is the nanosecond option when the work is short enough that milliseconds are too coarse.

## The two shapes that cost, measured

```js
const sum = (rows) => {
  let total = 0;

  for (const row of rows) {
    total += row.value;
  }

  return total;
};
```

A property read at one call site is fastest when every object has the same shape. Two measurements on a million records,
twenty passes each, on one machine:

| Input | Time |
| --- | --- |
| every object `{ value }` | 32 ms |
| three different shapes at one call site | 43 ms |
| objects with a property deleted | 271 ms |

The middle row is a megamorphic call site: the engine cannot decide which shape to expect, so each read is a lookup
rather than an offset. It costs about a third more, which is real and small enough that the code should stay readable.

The third row is the interesting one. A `delete` moves the object into a slower representation, and it stays there:

```js
const row = { value: 1, extra: 2 };

delete row.extra;              // the object is now a dictionary
```

Nearly four times slower for every later read of it, and nothing in the code says so. Build a new object without the
property instead:

```js
const { extra, ...rest } = row;
```

That is the one hidden-class rule worth following, and the JSON lesson and the objects lesson both point the same way
for their own reasons.

## What not to conclude from that table

Those numbers come from one run on one machine, and they are there to show the method rather than a truth about your
code. The same benchmark on another runtime, or after a change to the shapes involved, gives different numbers. Two
habits follow: keep the benchmark in the repository so a claim can be rechecked, and never apply an optimisation for a
difference the profiler did not show.

## A CPU profile finds the hot function

```bash
node --cpu-prof --cpu-prof-dir=./profiles report.js
```

That writes a `.cpuprofile` file, which opens in a browser's performance panel or in a tool that reads the format. The
picture is a flame graph: each frame's width is the time spent in it, and the widest frame near the top is where the
work is. Reading it top-down finds the function that matters in about a minute, which no amount of reasoning about the
source does.

```bash
node --prof report.js
node --prof-process isolate-*.log
```

`--prof` writes a tick log and `--prof-process` turns it into a summary, which is the version to use on a machine with
no browser.

## Event loop lag is the number to watch in a service

```js
import { monitorEventLoopDelay } from 'node:perf_hooks';

const delay = monitorEventLoopDelay({ resolution: 10 });
delay.enable();

setInterval(() => {
  console.log(`p99 lag ${(delay.percentile(99) / 1e6).toFixed(1)} ms`);

  delay.reset();
}, 10_000).unref();
```

The histogram measures how late a timer fires, which is the closest thing to a health signal for the event loop. A p99
that climbs is the signature of synchronous work on the main thread, and it shows a problem that average request latency
hides.

## The wins that come up most

| Symptom | Fix |
| --- | --- |
| Requests slower as the list grows | an index instead of a nested `find`, which the reshaping lesson covers |
| A loop of awaits | `Promise.all`, or a bounded pool |
| A large JSON payload | select fewer fields rather than stringify and parse a big object |
| Time in the garbage collector | fewer short-lived objects, or a typed array |
| Lag with no CPU use | something is blocking the loop, or a pool is saturated |
| A slow clone | `structuredClone` is the correct one and not the fastest; a JSON round trip was about twice as fast on a small plain object, and it loses dates and maps |

That last row is worth stating plainly: `structuredClone` took 152 ms for a hundred thousand clones where a JSON round
trip took 72 ms, on the same object. The JSON version is faster and wrong for anything but plain data, which is the trade
to make deliberately rather than by habit.

## Check yourself

Time the same function cold and after warmup, and note the difference. Then run a CPU profile of a script with one slow
loop and find the function in the flame graph. Finally build a million objects with a deleted property and compare a sum
over them with one over objects that were never changed.
