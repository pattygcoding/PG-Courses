---
title: Channels
summary: Sending values between threads, closing a loop by dropping the sender, and bounding a queue.
chapter: Concurrency
minutes: 13
status: draft
---

## A channel moves values

```rust
use std::sync::mpsc;

let (sender, receiver) = mpsc::channel::<u32>();

std::thread::spawn(move || {
    for value in 0..5 {
        sender.send(value).expect("receiver alive");
    }
});

for value in receiver {
    println!("{value}");
}
```

`mpsc` is multi producer, single consumer. `send` takes ownership of the value, so there is no aliasing and no
lock to reason about: the item belongs to exactly one side at a time. The `receiver` is an iterator that ends when
every `Sender` is dropped.

That last point is the whole termination rule: to stop a worker loop, drop the sender.

```rust
for message in receiver {
    process(message);
}
```

The loop ends when the sending side is gone, not when the queue is empty, since an empty queue may be filled
again.

## Several producers

```rust
let (sender, receiver) = mpsc::channel::<String>();

let senders: Vec<_> = (0..3)
    .map(|index| {
        let sender = sender.clone();

        std::thread::spawn(move || {
            sender.send(format!("worker {index}")).expect("receiver alive");
        })
    })
    .collect();

drop(sender);   // the original must go too, or the loop never ends

for message in receiver {
    println!("{message}");
}
```

Cloning a `Sender` gives another handle to the same queue. Remember to drop the original, because the receiver
only stops when the last one is gone, and an original kept alive for the rest of the function is a hang that looks
like a deadlock.

## A bounded channel applies backpressure

```rust
let (sender, receiver) = mpsc::sync_channel::<Vec<u8>>(8);

std::thread::spawn(move || {
    for index in 0..1000 {
        sender.send(vec![index as u8]).expect("receiver alive");
    }
});

for chunk in receiver {
    process(chunk);
}
```

`sync_channel` blocks the sender when the buffer is full, which is what stops a fast producer from filling memory
ahead of a slow consumer. An unbounded channel is the default and is the wrong choice when the producer can
outrun the consumer, which is most of the time in a service.

## Returning results

```rust
enum Message {
    Work(u32),
    Shutdown,
}
```

A worker that needs to report back uses a second channel, or a channel of closures. The common shape is a queue of
boxed jobs:

```rust
type Job = Box<dyn FnOnce() + Send + 'static>;

let (sender, receiver) = mpsc::channel::<Job>();
```

Each job carries its own work and its own reply channel if it needs one. That is how a thread pool is built in
about forty lines, and how a service queues work behind a fixed number of workers.

## When mpsc is not enough

`std::sync::mpsc` has one consumer. Several consumers need the `crossbeam-channel` crate, which offers a multi
consumer queue plus `select!` for waiting on several channels at once. A worker pool where any worker can take the
next job is the usual reason to reach for it, and it is a small dependency with a well tested implementation.

## Check yourself

Build a small worker pool: one job channel, four threads consuming it, and a result channel back to the main
thread. Send a hundred jobs, drop the sender, join the workers, and print the total.
