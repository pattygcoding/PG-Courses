---
title: Shared ownership with Rc, Arc and Weak
summary: Reference counting for a graph, the thread safe version, and the cycle that leaks.
chapter: Lifetimes and smart pointers
minutes: 14
status: draft
---

## Rc when several owners are real

```rust
use std::rc::Rc;

let shared = Rc::new(vec![1, 2, 3]);

let first = Rc::clone(&shared);
let second = Rc::clone(&shared);

println!("{} owners", Rc::strong_count(&shared));    // 3
```

`Rc` counts the owners and frees the value when the count reaches zero. `Rc::clone` increments a counter, which
is much cheaper than cloning the vector. It is not thread safe, so the compiler refuses to send an `Rc` to
another thread.

Reach for `Rc` when the ownership really is shared: two parts of a tree pointing at the same node, a callback
holding a handle to a service, a widget holding a reference to a shared model. When a borrowed reference or a
restructure would do, prefer those, since a count that reaches zero is not always the point you expected.

## Rc plus RefCell for shared mutable state

```rust
use std::cell::RefCell;
use std::rc::Rc;

let log = Rc::new(RefCell::new(Vec::new()));

let writer = Rc::clone(&log);
writer.borrow_mut().push(String::from("first"));

println!("{:?}", log.borrow());
```

`Rc<T>` only hands out shared references, so mutation goes through `RefCell`, which moves that check to run time.
This combination is common in single threaded graphs and is a signal to check whether the graph could own its
nodes instead.

## Arc for threads

```rust
use std::sync::Arc;

let data = Arc::new(vec![1, 2, 3]);

let handles: Vec<_> = (0..4)
    .map(|_| {
        let data = Arc::clone(&data);
        std::thread::spawn(move || data.len())
    })
    .collect();

for handle in handles {
    println!("{}", handle.join().expect("thread panicked"));
}
```

`Arc` is atomic reference counting, so the count can be updated from several threads at once. Each thread gets
its own clone and the vector is freed when the last one finishes. `Arc<T>` requires `T: Send + Sync` to be shared
across threads, which the compiler checks.

The usual combination for shared mutable state is `Arc<Mutex<T>>`, or `Arc<RwLock<T>>` when reads outnumber
writes.

## Weak breaks a cycle

```rust
use std::rc::{Rc, Weak};

struct Node {
    name: String,
    parent: Weak<Node>,
    children: Vec<Rc<Node>>,
}

let root = Rc::new(Node {
    name: String::from("root"),
    parent: Weak::new(),
    children: Vec::new(),
});
```

A parent holding `Rc` to its children and each child holding `Rc` to the parent is a cycle, so the count never
reaches zero and the whole tree leaks. `Weak` holds a non owning reference: it does not keep the value alive, so
the cycle is broken.

```rust
if let Some(parent) = node.parent.upgrade() {
    println!("parent is {}", parent.name);
}
```

`upgrade` returns `Option<Rc<T>>`, which is `None` if the value has already been dropped. That is the cost of a
weak reference: it can point at nothing, so every use checks.

## Cloning cheaply, writing rarely

```rust
let mut data = Arc::new(vec![1, 2, 3]);

Arc::make_mut(&mut data).push(4);
```

`Arc::make_mut` returns a mutable reference, cloning the contents only if another owner holds a reference. In a
hot path where the data is usually uniquely owned, that turns a lock or an unconditional clone into a counter
check.

## Check yourself

Build a two level tree where children hold `Rc` to a parent, then change the parent link to `Weak` and confirm
that a cycle no longer leaks by printing `Rc::strong_count` at the end of the scope.
