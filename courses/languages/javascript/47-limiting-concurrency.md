---
title: Limiting concurrency
summary: Why all at once is a bad default, and the two patterns that bound how much work is in flight.
chapter: Asynchronous JavaScript
minutes: 13
status: draft
---

## All at once has a ceiling

```js
await Promise.all(urls.map((url) => fetch(url)));
```

For ten URLs that is right. For ten thousand it opens ten thousand sockets, keeps ten thousand responses in memory, and
asks a server for more than it agreed to serve. The failures that follow are a connection error, a memory spike or a
rate limit, and none of them names the loop that caused it.

The fix is to bound how many operations are in flight at once, and there are two ways to do it.

## Batches are simple and uneven

```js
async function inBatches(items, size, worker) {
  const results = [];

  for (let index = 0; index < items.length; index += size) {
    const batch = items.slice(index, index + size);
    results.push(...(await Promise.all(batch.map(worker))));
  }

  return results;
}
```

Readable, and the cost is that every batch waits for its slowest member. One request that takes a second holds up the
whole batch, so the throughput is set by the worst case rather than by the limit.

## A pool keeps the limit full

```js
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, run);

  await Promise.all(workers);

  return results;
}
```

A fixed number of workers, each taking the next item when it finishes its last one. The limit stays full, the results
land at their original indices, and nothing waits for a slow sibling beyond occupying one slot of the limit. This is
worth understanding once, and a library such as `p-limit` or `p-map` is worth using rather than writing it again.

```js
const rows = await pool(urls, 8, (url) => fetch(url).then((r) => r.json()));
```

Eight in flight, results in the same order as the input, and a failure rejects the whole thing. A version that keeps
going after a failure returns `allSettled` results instead.

## A semaphore for work that arrives from elsewhere

```js
class Semaphore {
  #slots;
  #queue = [];

  constructor(slots) {
    this.#slots = slots;
  }

  async acquire() {
    if (this.#slots > 0) {
      this.#slots -= 1;
      return;
    }

    await new Promise((resolve) => this.#queue.push(resolve));
  }

  release() {
    const next = this.#queue.shift();

    if (next) {
      next();
      return;
    }

    this.#slots += 1;
  }

  async run(work) {
    await this.acquire();

    try {
      return await work();
    } finally {
      this.release();
    }
  }
}
```

A pool fits a known list; a semaphore fits a limit for the whole process, because the work arrives from callers rather
than from an array. The `finally` is what guarantees the slot is returned when the work throws, and forgetting it is how
a semaphore deadlocks after the first failure.

```js
const outbound = new Semaphore(16);

app.get('/proxy', async (request, response) => {
  response.json(await outbound.run(() => fetchUpstream(request.query.url)));
});
```

## Retries belong with the limit

```js
async function withRetry(work, attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }

      const backoff = 100 * 2 ** (attempt - 1);
      await sleep(backoff + Math.random() * 100);
    }
  }
}
```

Doubling the delay between attempts and adding a random amount is what stops a hundred clients from retrying in step and
hitting the recovering server with the same load again. That random part is called jitter, and leaving it out turns a
retry into a second outage.

Retry only what can succeed on a second attempt. A 400 or a validation failure will fail again, and retrying it wastes
the attempts that a timeout needed.

## Finding the right limit

The number comes from the constraint, not from taste:

| Constraint | The limit is |
| --- | --- |
| The service publishes a rate limit | that rate, shared across replicas |
| A connection pool | the pool size |
| Response memory | what the process can hold at once |
| A database | its connection limit divided by the replicas |

Start with a small number, measure the throughput, and raise it until the latency of one item starts to rise. That
point is where the bottleneck moved from your side to theirs.

## Check yourself

Run the same list of simulated requests through `Promise.all`, through batches of four and through a pool of four, and
time all three. Then make one item take ten times as long and compare the batches against the pool.
