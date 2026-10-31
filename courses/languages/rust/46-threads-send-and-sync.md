---
title: Threads, Send and Sync
summary: Spawning work, joining it, and the two marker traits that decide what can cross a thread boundary.
chapter: Concurrency
minutes: 14
status: draft
---

## Spawning a thread

```rust
use std::thread;

let handle = thread::spawn(|| {
    1 + 1
});

let result = handle.join().expect("thread panicked");
println!("{result}");
```

`spawn` starts an operating system thread and returns a `JoinHandle`. `join` blocks until the thread finishes and
returns a `Result`, because a panic in the thread is reported there rather than propagated. A thread that is
never joined either finishes on its own or is detached and cleaned up when the process ends.

The closure must be `move`, because the thread may outlive the current scope:

```rust
let values = vec![1, 2, 3];
let handle = thread::spawn(move || values.iter().sum::<i32>());
```

## Scoped threads can borrow

```rust
let mut data = vec![1, 2, 3];

std::thread::scope(|scope| {
    scope.spawn(|| {
        println!("{:?}", &data);
    });

    scope.spawn(|| {
        println!("len {}", data.len());
    });
});

data.push(4);
```

`thread::scope` guarantees every thread finishes before the scope ends, so the closures can borrow locals without
`move` and without `Arc`. It is the cleaner choice when the work is bounded by a function, and it removes most of
the reasons to reach for reference counting.

## Send and Sync

```rust
fn assert_send<T: Send>() {}
fn assert_sync<T: Sync>() {}

assert_send::<i32>();
assert_sync::<std::sync::Arc<i32>>();
```

`Send` means a value can be moved to another thread. `Sync` means a shared reference to it can be used from
another thread. Both are implemented automatically for types whose members meet the condition, which is why you
rarely write them and often see the compiler ask for them.

`Rc<T>` is neither, because the count is not atomic. `Cell<T>` and `RefCell<T>` are `Send` but not `Sync`, since
sharing one across threads would race. `Arc<T>` is both when `T` is. `Mutex<T>` is `Sync` when `T` is `Send`,
which is what makes `Arc<Mutex<T>>` the standard shareable mutable value.

```text
error[E0277]: `Rc<i32>` cannot be sent between threads safely
```

That error is the compiler telling you which line tried to cross a boundary and which member stopped it.

## How many threads

```rust
let cores = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1);
```

One thread per task is fine for a handful of long lived tasks and wrong for a million short ones, since each
thread costs a stack and a scheduler entry. Use a pool for many small items, which the `rayon` crate gives with
`par_iter`:

```rust
use rayon::prelude::*;

let total: u64 = records.par_iter().map(|record| record.size).sum();
```

That one line splits the work across the cores with no explicit thread management, and it is the first thing to
try when a loop over a large collection is the bottleneck.

## Sharing versus sending

Two styles work, and picking one keeps a design coherent. Sharing state through an `Arc<Mutex<T>>` is direct and
serialises every access. Sending messages through a channel gives each thread its own data and makes the
handover explicit, which avoids a class of lock bug entirely. The next two lessons cover each.

## Check yourself

Spawn four threads that each sum a quarter of a vector and add the results, once with `thread::spawn` and `move`,
and once with `thread::scope` borrowing the vector. Then try to send an `Rc` to a thread and read the error.
