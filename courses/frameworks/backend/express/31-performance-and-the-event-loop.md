---
title: Performance and the event loop
summary: One thread, the work that blocks it, and the measurements that decide what to change.
chapter: Testing and quality
minutes: 14
status: draft
---

## One thread, and a queue

Node runs your JavaScript on one thread. Requests are accepted by the runtime, handed to that thread one callback at a time,
and anything asynchronous, such as a database call or a file read, waits on a queue while the thread takes the next thing.

The consequence is the only rule to remember: **any synchronous work blocks every other request**. A 50ms synchronous
operation is a 50ms pause in a server that is otherwise answering in a millisecond, and a hundred requests waiting behind it
each pay the same 50ms.

## Two numbers from the running application

```bash
curl -s -o /dev/null -w '%{time_total}s\n' -X POST http://localhost:3000/auth/sign-in -H 'content-type: application/json' --data @scratch/signin.json
curl -s -o /dev/null -w '%{time_total}s\n' http://localhost:3000/books
```

```text
0.0238s      sign-in, three runs: 0.0238, 0.0383, 0.0236
0.0014s      a catalogue read: 0.0014, 0.0013, 0.0013
```

Twenty-four milliseconds against one and a third. The difference is the password hash doing its job, and it is worth knowing
what those twenty-four milliseconds are:

```bash
node -e "const {scryptSync,scrypt}=require('node:crypto'); ..."
```

```text
sync  21.7682 ms
async 23.6337 ms, and the loop was free while it ran
```

The same work, the same cost, and one difference that matters: `scryptSync` holds the thread for all 21.8 milliseconds, while
the asynchronous form hands the work to the thread pool and lets the event loop carry on.

This application uses `scryptSync`, which means a sign-in blocks every other request for twenty milliseconds. On one instance
with occasional traffic that is invisible. At a hundred sign-ins a second it is the whole throughput, and the fix is one line:

```ts
import { promisify } from "node:util";
import { scrypt } from "node:crypto";

const scryptAsync = promisify(scrypt);

const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
```

The functions to look at with suspicion are the ones with `Sync` in the name: `readFileSync`, `execSync`, `scryptSync`, and
any tight loop over a large array. Each has a legitimate use in a script and a suspicious one in a request.

## What else is CPU-bound

| Work | Where it belongs |
| --- | --- |
| hashing a password | the async form, or a worker |
| resizing an image | a worker, or a queue |
| a report over ten thousand rows | a queue, and the result stored |
| JSON of a huge payload | a limit on the endpoint, and pagination |
| a template rendered per request | cached, or a build step |

The pattern behind the table: work that scales with input belongs somewhere that can grow, and the event loop is not it. A
worker thread or a separate process is the answer for the first two rows, and a background job is the answer for the third.

## The database is a second thread

```bash
curl -s -o /dev/null -w '%{time_total}s\n' 'http://localhost:3000/books?q=edda'
```

```text
0.0025s
```

`node:sqlite` runs its statements synchronously on a native thread, so a query does block the event loop for its duration. The
saving grace is the duration: a query against a local file with an index is microseconds, and the queries in this application
stay under a millisecond.

What breaks that is an unindexed scan over a growing table, which is why the schema has a partial index and why the paging
lesson put a ceiling on `perPage`. An endpoint that returns ten thousand rows costs the JSON encoding as well as the query,
and both are on the thread.

A client-server database removes the query from the thread entirely, which is one of the reasons to move: the cost of the
network round trip is paid in wall-clock time rather than in blocked throughput.

## The cheap wins first

| Change | Effect |
| --- | --- |
| `keepAliveTimeout` below the proxy's | fewer connections torn down mid-request |
| compression on a large response | fewer bytes, at the cost of CPU |
| a cache header instead of a handler | no request at all for a repeat |
| a limit on every list endpoint | a bounded response per request |
| fewer middleware per request | a shorter chain before the handler |

Two of those have a cost that belongs in the sentence: compression buys bandwidth with CPU, and on a JSON API the ratio is
often good. A cache header is better than both, because the request never arrives.

The middleware table from the architecture lesson is a performance table too. Every `app.use` runs for every request that
reaches it, so a static file middleware registered before the routers costs a filesystem lookup on every API call.

## Measuring, and what to measure

```text
throughput     requests per second at a fixed concurrency
latency        the time one request takes, at the 50th and the 99th percentile
the loop       how long the thread is busy versus waiting
```

The percentile matters more than the average. An endpoint with a 5ms average and a 400ms 99th percentile is an endpoint where
one user in a hundred has a bad time, and the average hides exactly that user. Where the 99th percentile is the number to
watch, the event loop is usually where the time went.

The tools are whatever is at hand: `curl -w '%{time_total}'` for one request, an autocannon or `ab` run for a load, and the
request log's `durationMs` field for what actually happened in production. That field exists in every line this application
writes, which is why it is worth adding before the day somebody asks why the API is slow.

## Check yourself

Replace `scryptSync` with the promisified form, then run ten sign-ins at once and compare the total time with the synchronous
version. Then add a route that reads a large file synchronously and measure a fast request in parallel with it, which is the
clearest demonstration of what blocking the loop means.
