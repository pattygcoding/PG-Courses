---
title: Shared state with Arc, Mutex and RwLock
summary: Locking mutable state across threads, what poisoning means, and the deadlock the compiler cannot see.
chapter: Concurrency
minutes: 14
status: draft
---

## The standard shareable mutable value

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

let counts = Arc::new(Mutex::new(HashMap::<String, u32>::new()));

let handles: Vec<_> = ["a", "b", "a"]
    .into_iter()
    .map(|word| {
        let counts = Arc::clone(&counts);

        std::thread::spawn(move || {
            let mut map = counts.lock().expect("poisoned");
            *map.entry(word.to_string()).or_insert(0) += 1;
        })
    })
    .collect();

for handle in handles {
    handle.join().expect("thread panicked");
}

println!("{:?}", counts.lock().expect("poisoned"));
```

`Arc` shares ownership, `Mutex` allows mutation, and the lock is held only for the few lines that touch the map.
Three threads updating a `HashMap` without a lock would be a data race the compiler refuses to compile; with the
lock it is a compile and run correctly.

## The guard releases the lock when it drops

```rust
let counts = Arc::new(Mutex::new(0u32));

{
    let mut value = counts.lock().expect("poisoned");
    *value += 1;
}   // the lock releases here

let snapshot = *counts.lock().expect("poisoned");
```

`lock` returns a `MutexGuard`, and the lock lives as long as the guard. Holding the guard across a long operation
serialises every other thread, so keep the scope tight: read or update, then let it drop. A guard held for the
whole function is a lock granularity problem, and a guard held across an `await` is a bug even though it compiles
in a single threaded executor.

## Poisoning

```rust
match counts.lock() {
    Ok(guard) => *guard,
    Err(poisoned) => *poisoned.into_inner(),
}
```

A thread that panics while holding the lock leaves it poisoned, and every later `lock` returns an error. That is
the library reporting that the protected value may be half updated. A program that treats the data as
recoverable uses `into_inner`, and one that does not propagates the error or exits.

## RwLock lets several readers in

```rust
use std::sync::RwLock;

let config = RwLock::new(String::from("initial"));

let text = config.read().expect("poisoned");
println!("{text}");
drop(text);

*config.write().expect("poisoned") = String::from("updated");
```

`read` allows any number of concurrent readers and `write` excludes everything. It wins when reads greatly
outnumber writes and the critical section is long enough to matter. A short section usually does not pay for the
extra bookkeeping, and `parking_lot::RwLock` is worth measuring against `std` if it does.

## Deadlock

```rust
fn transfer(from: &Mutex<i64>, to: &Mutex<i64>, amount: i64) {
    let mut a = from.lock().expect("poisoned");
    let mut b = to.lock().expect("poisoned");

    *a -= amount;
    *b += amount;
}
```

Two threads calling this in opposite directions with the same pair of mutexes can each hold one lock and wait for
the other forever. The compiler cannot see it. The fix is a global order: lock the mutex with the lower address
first, or restructure so the two values live behind one lock and there is only one to take.

The other classic is taking two locks in sequence in one thread and one in another. Naming the lock order in a
comment at the top of the module is the cheap mitigation, and a single `Mutex` over the whole structure removes
the problem when the contention cost allows it.

## When a lock is the wrong tool

```rust
use std::sync::atomic::{AtomicU64, Ordering};

let counter = AtomicU64::new(0);
counter.fetch_add(1, Ordering::Relaxed);
```

A counter, a flag or a pointer swap does not need a lock, and an atomic does it with a single instruction. Values
read and replaced as a unit, such as a configuration struct, fit `arc_swap::ArcSwap` or an `RwLock`. A structure
with many independently updated parts is often better owned by one thread and reached through a channel.

## Check yourself

Write a program with eight threads incrementing a shared counter behind a `Mutex`, twice: once with the lock held
for one increment and once with it held across a sleep. Time both, and explain the difference.
