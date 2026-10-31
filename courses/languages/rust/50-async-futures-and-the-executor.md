---
title: async, futures and the executor
summary: An async function returns a state machine, and nothing runs until an executor polls it.
chapter: Concurrency
minutes: 14
status: draft
---

## async fn returns a Future

```rust
async fn fetch(id: u64) -> String {
    format!("record {id}")
}
```

Calling `fetch(1)` runs no code. It builds a value implementing `Future<Output = String>`, which is a state
machine waiting to be driven. Nothing happens until something calls `poll` on it, which is what `.await` and an
executor do.

```rust
let future = fetch(1);       // nothing has run
let value = future.await;    // now the body runs to the first suspension point
```

`.await` can only appear inside an `async fn` or an `async` block, which is how the compiler knows to compile that
function into a state machine rather than a plain function.

## The Future trait is small

```rust
trait Future {
    type Output;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}

enum Poll<T> {
    Ready(T),
    Pending,
}
```

`poll` returns `Ready` with the output or `Pending` when it is not finished. A `Pending` return must arrange for
the context's waker to be called when progress is possible, which is how the executor knows to poll again instead
of spinning. That is the entire mechanism: the runtime is a loop that polls ready futures and parks the thread
when none are ready.

## Pin exists because futures are state machines

```rust
fn poll_once<F: Future + Unpin>(future: F) { /* ... */ }
```

An async function can hold a reference across an `await`, and the generated state machine can contain a
self-reference. Moving it after that point would invalidate the reference, so `Pin` marks a future as immovable.
Most code never names `Pin`, because `.await` and the executor handle it. It appears in hand written `Future`
implementations and in error messages, and lesson 60 covers the cases that need it.

## Concurrency is not parallelism

```rust
async fn both() -> (String, String) {
    let a = fetch(1);
    let b = fetch(2);

    let (first, second) = futures::join!(a, b);
    (first, second)
}
```

Two futures can make progress together on one thread, because when one is waiting for a response the other runs.
That is concurrency: interleaving waits. Parallelism needs several threads or cores. The gain from async is that a
program can hold ten thousand connections on a few threads, since a waiting connection costs a small future
rather than a stack.

The cost is that the compiler generates a larger type per async function and that a blocking call inside an async
function stalls the whole executor thread, holding up every other task on it.

## Cancellation happens by dropping

```rust
let future = fetch(1);
drop(future);   // the future is cancelled here
```

Dropping a future stops it at the point it was suspended. That is the cancellation model, and it is why an
`async fn` should not be expected to run to completion: a timeout built from `select!` or `timeout` drops the
losing future. Any cleanup that a `Drop` implementation performs still runs, and a file written through an async
API may be left partly written.

## When async is not the answer

A program that does one thing at a time, or a fixed number of things for the whole run, is simpler with threads.
Async pays when the number of concurrent waits is large and each one spends most of its time waiting on I/O. A
CPU bound workload is a case for a thread pool such as `rayon`, because async adds overhead and buys nothing.

## Check yourself

Write an `async fn` that prints at its start, call it without awaiting, and confirm nothing prints. Then await it.
Write two futures and run them with `futures::join!`, timing them against running them one after the other, with
a `sleep` where the I/O would be.
