---
title: Atomics and memory ordering
summary: Counters and flags without a lock, and what each ordering actually promises.
chapter: Concurrency
minutes: 14
status: draft
---

## An atomic is a value with atomic operations

```rust
use std::sync::atomic::{AtomicU64, Ordering};

static REQUESTS: AtomicU64 = AtomicU64::new(0);

fn record_request() {
    REQUESTS.fetch_add(1, Ordering::Relaxed);
}

fn total() -> u64 {
    REQUESTS.load(Ordering::Relaxed)
}
```

`AtomicU64` can be a `static` because it is constructed in a `const` context, unlike a `Mutex`, which needs a
runtime initialiser or a `OnceLock`. There is no lock: `fetch_add` is a single instruction that adds one and
returns the previous value, and several threads can call it at once without a data race.

The available types are `AtomicBool`, `AtomicU8` through `AtomicU64`, `AtomicUsize`, `AtomicIsize` and
`AtomicPtr<T>`. Each has `load`, `store`, `swap` and the arithmetic operations where they make sense.

## Ordering is the part worth slowing down for

```rust
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

static READY: AtomicBool = AtomicBool::new(false);
static DATA: AtomicU64 = AtomicU64::new(0);

// thread A
DATA.store(42, Ordering::Relaxed);
READY.store(true, Ordering::Release);

// thread B
while !READY.load(Ordering::Acquire) {}
let value = DATA.load(Ordering::Relaxed);
```

`Release` on the store and `Acquire` on the load form a pair: everything thread A wrote before the store is
visible to thread B after the load. That is what makes the pattern above correct, and swapping either side to
`Relaxed` makes it incorrect even though the code looks the same.

The two relaxed accesses are deliberate. The ordering comes from the flag, so the data itself does not need to
carry it, which is what keeps the fast path cheap.

| Ordering | What it promises |
| --- | --- |
| `Relaxed` | atomicity only, no ordering with other memory |
| `Acquire` | nothing after this load moves before it |
| `Release` | nothing before this store moves after it |
| `AcqRel` | both, for a read modify write |
| `SeqCst` | the pair above plus one total order across all threads |

Use `SeqCst` when you are not sure. It is slightly stronger and slightly slower than the minimum, and it is far
easier to reason about than a hand picked pair of `Acquire` and `Release` in code that may be edited later. Reach
for `Relaxed` where the value is genuinely a standalone counter, such as a metric.

## A counter that is genuinely relaxed

```rust
use std::sync::atomic::AtomicUsize;

struct Pool {
    active: AtomicUsize,
}

impl Pool {
    fn acquire(&self) -> usize {
        self.active.fetch_add(1, Ordering::Relaxed) + 1
    }

    fn release(&self) -> usize {
        self.active.fetch_sub(1, Ordering::Relaxed) - 1
    }
}
```

Nothing depends on the order between this counter and other memory, so `Relaxed` is correct and is the fastest
option. A metric, a pool size and a request count are the standard cases.

## Compare and swap

```rust
fn bump_max(max: &AtomicU64, candidate: u64) {
    let mut current = max.load(Ordering::Relaxed);

    while candidate > current {
        match max.compare_exchange_weak(
            current,
            candidate,
            Ordering::Relaxed,
            Ordering::Relaxed,
        ) {
            Ok(_) => return,
            Err(actual) => current = actual,
        }
    }
}
```

`compare_exchange` writes the new value only when the current value is the one expected, and reports the actual
value otherwise. The loop retries until it succeeds, which is the standard way to update a value that depends on
its previous state. `compare_exchange_weak` may fail spuriously and is the right choice inside a loop.

## When not to reach for one

An atomic is right for a counter, a flag and a pointer. It is wrong for anything with two fields that must change
together, for a collection, and for a value a thread reads several times expecting consistency. Those need a lock,
a channel, or ownership by one thread. The most common atomic bug is not an ordering mistake but a compound
operation written as two atomics that are individually fine.

## Check yourself

Replace a `Mutex<u64>` counter with an `AtomicU64` and benchmark both under contention from eight threads. Then
write a flag published with `Release` and read with `Acquire` and explain what breaks if either side is `Relaxed`.
