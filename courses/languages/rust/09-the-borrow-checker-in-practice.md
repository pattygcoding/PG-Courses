---
title: The borrow checker in practice
summary: The five errors you will meet repeatedly, and the change each one is asking for.
chapter: Ownership and borrowing
minutes: 14
status: draft
---

## Returning a reference to a local

```rust
fn build() -> &str {
    let text = String::from("hi");
    &text
}
```

Take the buffer as a parameter, or return an owned `String`. The reference cannot escape because the buffer
is freed when the function returns, and no annotation can change that.

## Mutating while iterating

```rust
let mut items = vec![1, 2, 3];

for item in &items {
    if *item == 2 {
        items.push(4);   // error: cannot borrow `items` as mutable
    }
}
```

The loop holds a shared borrow for its whole body, so a push would invalidate the iterator. Collect the
changes and apply them after the loop, or filter instead:

```rust
let items = vec![1, 2, 3];
let mut updated = Vec::with_capacity(items.len() + 1);

for item in &items {
    updated.push(*item);
}

updated.push(4);
```

## Two fields and one method

```rust
struct Config {
    host: String,
    port: u16,
}

let mut config = Config { host: String::new(), port: 80 };
let host = &config.host;
config.port = 8080;         // fine: a different field
config.host = String::from("db");   // error: cannot assign because it is borrowed
println!("{host}");
```

Field level borrows are tracked separately, so changing `port` while `host` is borrowed is allowed. The
compiler is precise, and an error here means the borrow really does overlap the write.

## A value used after it moved into a closure

```rust
let names = vec!["ada", "grace"];
let shout = || names.len();

println!("{}", shout());
println!("{names:?}");      // fine: the closure borrowed
```

A closure captures by reference when it can, so the value stays usable. Adding `move` makes it take
ownership, which is required when the closure outlives the current scope:

```rust
let names = vec!["ada", "grace"];
let worker = std::thread::spawn(move || names.len());
println!("{}", worker.join().unwrap());
```

Without `move` the closure would borrow a vector that the thread may outlive, and the compiler says so.

## Holding a borrow across an await

```rust
async fn update(cache: &mut Vec<String>) {
    let last = cache.last();          // borrow of cache
    do_work().await;                  // the borrow is held across this
    println!("{last:?}");
}
```

An async function can be suspended and resumed, so the compiler rejects a borrow held across an `await` where
the future must be `Send`. Clone the value, take an owned copy, or scope the borrow before the await.

## The habit that avoids most of this

Take references in parameters, own the values you return, and keep a borrow inside the smallest scope that
needs it. A signature that borrows for the shortest time the work allows is the one that satisfies the
compiler without argument.

## Check yourself

Reproduce each of the five errors above in one file, then write the smallest change that satisfies the
compiler for each. Note which of the five changes also made the code easier to read.
