---
title: Memory, leaks and weak references
summary: What keeps an object alive, the four places a leak hides, and how to find the one you have.
chapter: Testing and quality
minutes: 13
status: draft
---

## A leak is a reference nobody dropped

```js
const cache = new Map();

function remember(request) {
  cache.set(request.id, request);
}
```

The garbage collector reclaims anything unreachable. A leak in JavaScript is an object that is still reachable from
something long lived, so the collector is behaving correctly and the program is holding on to more than it meant to. The
four places it hides:

| Held by | Example |
| --- | --- |
| A module-level collection | a cache, a registry, an array of recent events |
| A listener that is never removed | an event handler capturing a large object |
| A timer that is never cleared | a `setInterval` keeping its callback and its closure alive |
| A closure | a function returned from a factory, holding the scope it was made in |

```js
const listeners = [];

function subscribe(handler) {
  listeners.push(handler);        // and nothing ever removes one
}

function unsubscribe(handler) {
  const index = listeners.indexOf(handler);

  if (index !== -1) {
    listeners.splice(index, 1);
  }
}
```

Every subscription needs a way out. Where the framework provides one, use it, and where it does not, an `AbortSignal` is
the mechanism that removes a listener automatically.

## Weak references let go

```js
const metadata = new WeakMap();

function annotate(element) {
  metadata.set(element, { createdAt: Date.now() });
}
```

A `WeakMap` keyed by the object does not keep the object alive, so the entry disappears with it. That is the difference
between a cache of metadata and a leak, and it is the reason to reach for the weak collections whenever the key is
something you do not own: a DOM node, a request object, a caller's instance.

```js
const seen = new WeakSet();
```

A `WeakSet` is the same idea for a yes or no fact. Neither is iterable and neither has a size, which is the price of not
holding the keys.

## WeakRef when you really want a cache

```js
const cache = new Map();

function get(key) {
  const held = cache.get(key);
  const value = held?.deref();

  if (value !== undefined) {
    return value;
  }

  const created = expensive(key);
  cache.set(key, new WeakRef(created));

  return created;
}
```

`WeakRef` holds a reference that does not keep the object alive, and `deref()` returns the object or `undefined`. That is
how a cache lets an entry go when the memory pressure calls for it, with no eviction policy to write.

Two things to know. The entry in the `Map` is not itself weak, so the map still grows; a cache built this way needs a
sweep that drops the entries whose `deref()` returns `undefined`. And the timing is not precise: an object can be
collected while a `WeakRef` to it exists, at any point after the last strong reference goes.

```js
const registry = new FinalizationRegistry((key) => {
  cache.delete(key);
});
```

`FinalizationRegistry` calls a function after an object is collected, which is another way to sweep the keys. It is not
deterministic either, and it must not be used for anything that has to happen. Use it to release memory, not to close a
file.

Neither of these is a substitute for a bound. An LRU cache with a maximum size is a policy you can reason about; a weak
cache is one you cannot.

## Finding the leak

```js
setInterval(() => {
  const { heapUsed, rss, external } = process.memoryUsage();

  console.log(`heap ${(heapUsed / 1e6).toFixed(1)} MB, rss ${(rss / 1e6).toFixed(1)} MB, external ${(external / 1e6).toFixed(1)} MB`);
}, 30_000).unref();
```

`heapUsed` is what the garbage collector manages, `rss` is the whole process including native memory, and `external` is
buffers outside the heap. A heap that climbs and comes back down after a collection is fine; one that only climbs is the
leak. `rss` growing while `heapUsed` is flat points at native memory, which is a buffer that was never released rather
than a JavaScript object.

```bash
node --heapsnapshot-signal=SIGUSR2 report.js
```

That makes the process write a heap snapshot when it receives the signal, which is how a snapshot is taken from something
already running in production. Loading two snapshots a few minutes apart into a browser's memory panel and looking at the
difference in retained size names the object that is accumulating, and the retainer path names what is holding it.

```bash
node --expose-gc -e "global.gc(); console.log(process.memoryUsage().heapUsed)"
```

`global.gc()` forces a collection, and it only exists with `--expose-gc`. It is the way to confirm that a growth in
`heapUsed` is live data rather than garbage that has not been collected yet.

## The leak in a long running service

```js
const requests = new Map();

app.use((request, response, next) => {
  requests.set(request.id, request);
  next();
});
```

One entry per request in a module-level map, and nothing removes them. The service is fine for an hour and dies
overnight, and the heap snapshot shows a million request objects retained by one map. Every module-level collection in a
service needs a bound and a removal, or it needs to not exist.

## Cleaning up what you opened

```js
const controller = new AbortController();

app.use((request, response, next) => {
  response.on('close', () => controller.abort());
  next();
});
```

A stream, a socket, a database connection and a file handle all hold something outside the heap, and `external` is where
that shows. Closing on the response's close event is the pattern for a request-scoped resource, and it is the same
mechanism as the signal cleanup in the cancellation lesson.

## Check yourself

Create a module-level map that grows on every request in a small script, print `process.memoryUsage()` every second, and
watch `heapUsed` climb. Then bound the map and confirm it stops. Finally key the same map with a `WeakMap` and explain
what changed.
