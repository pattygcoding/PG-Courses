---
title: Async in practice with tokio
summary: An executor, spawning tasks, timeouts and shutdown, plus the blocking call that ruins it all.
chapter: Concurrency
minutes: 14
status: draft
---

## The runtime

```toml
[dependencies]
tokio = { version = "1", features = ["rt-multi-thread", "macros", "time", "sync"] }
```

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let body = fetch("https://example.com").await?;
    println!("{} bytes", body.len());

    Ok(())
}
```

`#[tokio::main]` rewrites `main` into a synchronous function that builds a multi threaded runtime and blocks on
the future. The feature list matters: `rt-multi-thread` gives the thread pool, `macros` gives `#[tokio::main]` and
`select!`, and each one is code you do not link if you leave it out.

## Spawning tasks

```rust
let handle = tokio::spawn(async move {
    fetch("https://example.com").await
});

let body = handle.await??;
```

`tokio::spawn` hands a future to the runtime and returns a `JoinHandle`. The future must be `Send + 'static`, so
everything it captures has to be owned and shareable. The double `?` unwraps two layers: the join error from a
panicked or cancelled task, and the `Result` the future itself returned.

`tokio` also has its own channel types, which are async aware:

```rust
let (tx, mut rx) = tokio::sync::mpsc::channel::<u64>(32);

tokio::spawn(async move {
    tx.send(1).await.expect("receiver alive");
});

while let Some(value) = rx.recv().await {
    println!("{value}");
}
```

`send` on a bounded `tokio` channel awaits when the buffer is full, which is backpressure that cooperates with the
executor rather than blocking a thread.

## Blocking work blocks everything

```rust
let hash = tokio::task::spawn_blocking(move || expensive_hash(data))
    .await
    .expect("task joined");
```

A call that blocks, such as reading a file with `std::fs`, doing a large parse, or waiting on a lock, holds the
executor thread and stalls every task scheduled on it. Wrap the work in `spawn_blocking` and let the runtime put it
on a thread pool meant for it. The same applies to a `std::sync::Mutex`: it may block, so it must not be held
across an `await`. Use `tokio::sync::Mutex` there, or restructure so the lock is taken and released inside one
non await region.

## Timeouts and choosing between futures

```rust
use std::time::Duration;

let body = tokio::time::timeout(Duration::from_secs(5), fetch(url)).await??;

tokio::select! {
    result = fetch(url) => println!("{result:?}"),
    _ = tokio::time::sleep(Duration::from_secs(5)) => println!("timed out"),
}
```

`timeout` returns an `Err` when the future did not finish and drops it, which is the cancellation model in
practice. `select!` waits on several futures and takes the first to finish, dropping the others. Both are the
reason an async function must tolerate being stopped part way through.

## Shutting down cleanly

```rust
use tokio_util::sync::CancellationToken;

let token = CancellationToken::new();

let worker = {
    let token = token.clone();

    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = token.cancelled() => break,
                Some(job) = next_job() => process(job).await,
            }
        }
    })
};

token.cancel();
worker.await.expect("worker joined");
```

A shutdown signal passed to every task is how a service stops without leaving a half written file or a lost
message. `select!` inside the loop is what lets a long wait be interrupted, and the same shape works with a
broadcast channel when the signal has to reach many components.

## Check yourself

Write a program that fetches several URLs concurrently with `tokio::spawn`, prints the fastest with `select!`, and
stops everything on the first error with a cancellation token. Then replace one `reqwest` call with a
`std::thread::sleep` and observe what happens to the other tasks.
