---
title: Async generators and streaming
summary: Awaiting inside a generator, paging an API lazily, and the for await loop that closes it early.
chapter: Generators and metaprogramming
minutes: 13
status: draft
---

## An async generator can await

```js
async function* lines(path) {
  const reader = open(path);

  try {
    let line = await reader.read();

    while (line !== null) {
      yield line;
      line = await reader.read();
    }
  } finally {
    await reader.close();
  }
}

for await (const line of lines('report.csv')) {
  console.log(line.length);
}
```

`async function*` returns an async generator, which implements `Symbol.asyncIterator` and is consumed with
`for await...of`. Each `yield` produces a value that the consumer awaits, so the loop body can be asynchronous as well,
and the generator stays suspended between values with its own state.

The `finally` block runs when the loop breaks or throws, which is where a file handle or a connection is released. That
is the same guarantee `for...of` gives a synchronous generator, extended to something that has to await the cleanup.

## Paging an API

```js
async function* pages(url, size = 100) {
  let offset = 0;

  while (true) {
    const response = await fetch(`${url}?offset=${offset}&limit=${size}`);

    if (!response.ok) {
      throw new Error(`request failed: ${response.status}`);
    }

    const page = await response.json();

    if (page.length === 0) {
      return;
    }

    yield page;
    offset += page.length;
  }
}

for await (const page of pages('/api/rows')) {
  for (const row of page) {
    process(row);
  }
}
```

The consumer sees pages as they arrive and never holds the whole result set. A caller that only needs the first page
breaks out of the loop and the remaining requests are never made, which is the property an eager `fetchAll` cannot
have.

The same shape covers a cursor, a scan over a table and a log file that is still being written:
`return` ends the stream, `throw` reports a failure to the consumer, and the loop conditions are ordinary code.

## Consuming a stream

```js
for await (const value of values) {
  await save(value);
}
```

The loop is sequential: each iteration waits for the previous one, which is the backpressure you want when the
consumer is slower than the producer. To run several at once, collect a batch first and await the batch:

```js
const batch = [];

for await (const row of pages('/api/rows')) {
  batch.push(...row);

  if (batch.length >= 500) {
    await Promise.all(batch.map(save));
    batch.length = 0;
  }
}
```

That is a bounded buffer written by hand, and it is the right pattern when the work per item is independent and the
producer is fast. The bound is what stops the batch growing without limit.

## An async generator from a list of promises

```js
async function* settled(promises) {
  for (const promise of promises) {
    yield await promise;
  }
}
```

That one awaits them in order, so a slow first promise delays everything behind it. To take them as they finish,
`Promise.allSettled` or a queue is the tool, and the async chapter covers the difference. The generator above is there
to make the sequencing explicit rather than accidental.

## Breaking out of the loop

```js
async function firstMatch(pattern) {
  for await (const line of lines('big.log')) {
    if (line.includes(pattern)) {
      return line;
    }
  }

  return null;
}
```

```text
closing
```

The `return` inside the loop ends the generator, runs its `finally` block, waits for the `await` inside it, and then
returns the value. That order is what makes a stream safe to abandon: a file that is still open is closed before the
function that owned it finishes.

## What is already an async iterable

```js
const response = await fetch('/api/rows');

for await (const chunk of response.body) {
  console.log(chunk.byteLength);
}
```

A `fetch` response body is an async iterable of `Uint8Array` chunks, so a large download can be processed as it
arrives. In Node, a `Readable` stream and the `readline` interface are async iterable too, which is why a file or a
pipe is read with the same loop as anything else.

```js
import { createReadStream } from 'node:fs';

for await (const chunk of createReadStream('big.csv')) {
  consume(chunk);
}
```

## Collecting an async iterable

```js
const rows = await Array.fromAsync(pages('/api/rows'));
```

`Array.fromAsync` awaits an async iterable and returns an array, which is the one line for the case where the whole
stream is wanted after all. It is recent, so a loop that pushes into an array is the portable version.

## Where an async generator is the wrong tool

A stream of one value is a promise, and wrapping it in a generator adds a layer for nothing. A fixed list that is
already in memory is an array, and `for await` over it works while doing nothing useful. The case for an async
generator is a sequence whose length is unknown and whose later items cost something to produce, which is a paginated
API, a large file and a long running subscription.

## Check yourself

Write an async generator that yields the pages of a paginated list, consume three pages with `for await`, and confirm
the fourth request is never made when the loop breaks. Then add a `finally` block and print when it runs.
