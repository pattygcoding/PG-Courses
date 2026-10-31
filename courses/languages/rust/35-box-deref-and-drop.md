---
title: Box, Deref and Drop
summary: Heap allocation for the cases that need it, the trait behind method resolution, and the destructor.
chapter: Lifetimes and smart pointers
minutes: 14
status: draft
---

## Box puts a value on the heap

```rust
let boxed: Box<i32> = Box::new(42);
println!("{}", *boxed + 1);
```

`Box<T>` owns one heap allocation and is the cheapest smart pointer: no counter, no lock, and the same size as a
pointer. Three cases call for it.

A recursive type needs it, because a struct cannot contain itself:

```rust
#[derive(Debug)]
enum Tree {
    Leaf(i32),
    Branch(Box<Tree>, Box<Tree>),
}
```

A large variant shrinks the enum, since the variant is a pointer rather than the whole struct:

```rust
enum Message {
    Quit,
    Payload(Box<[u8; 4096]>),
}
```

And a value that needs a stable address does too, because moving a `Box` moves the pointer rather than the
contents.

## Deref is what makes * work and methods resolve

```rust
use std::ops::Deref;

struct Metres(f64);

impl Deref for Metres {
    type Target = f64;

    fn deref(&self) -> &f64 {
        &self.0
    }
}

let distance = Metres(3.5);
println!("{}", distance.abs());
println!("{}", *distance);
```

Implementing `Deref` gives the newtype every method of the inner type, which is convenient and widely
discouraged for anything that is not a smart pointer. `String: Deref<Target = str>` and `Vec<T>: Deref<Target = [T]>`
are the pattern: the type is a wrapper around the target and behaves like it. A newtype that derefs to its inner
type exposes the whole inner API and loses the point of the newtype.

## Drop runs when the owner goes out of scope

```rust
struct Guard {
    name: String,
}

impl Drop for Guard {
    fn drop(&mut self) {
        println!("dropping {}", self.name);
    }
}

fn main() {
    let _first = Guard { name: String::from("first") };
    let _second = Guard { name: String::from("second") };
}
```

Locals drop in reverse declaration order, so `second` prints before `first`. A struct's fields drop in
declaration order. This is how a file handle closes and a lock releases without a `finally`, and it is why a
`MutexGuard` unlocks at the end of the block.

```rust
let guard = mutex.lock().expect("poisoned");
// the lock is released here, at the end of the scope
```

## Dropping early and moving values out

```rust
let guard = mutex.lock().expect("poisoned");

drop(guard);                     // release the lock now

let mut value = String::from("a");
let taken = std::mem::take(&mut value);          // leaves the default
let replaced = std::mem::replace(&mut value, String::from("b"));

let mut a = 1;
let mut b = 2;
std::mem::swap(&mut a, &mut b);
```

`drop` is a function that takes ownership and does nothing with it, which is the idiom for releasing a resource
on the next line rather than at the end of the scope. `mem::take` and `mem::replace` move a value out of a
borrowed slot, which is what a state machine wants.

A type cannot be both `Drop` and `Copy`, because a destructor that runs twice on a copied value would be a
bug. That is a rule the compiler enforces rather than a style choice.

## Check yourself

Write a type with a `Drop` implementation holding a name, create three of them in one scope, and record the
order they print. Then implement `Drop` and try to derive `Copy` on the same type and read the error.
