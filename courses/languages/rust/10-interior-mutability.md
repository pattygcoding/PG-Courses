---
title: Interior mutability
summary: Cell, RefCell, OnceLock and Mutex, and the cases that really need to change through a shared reference.
chapter: Ownership and borrowing
minutes: 14
status: draft
---

## The case for it

A shared reference normally means read only. Sometimes a value has to change through one: a cache, a call
counter, a lazily initialised field, or anything behind a trait method that takes `&self`. Interior
mutability moves the borrow check from compile time to run time for one value, and the rest of the program
keeps its guarantees.

## Cell for Copy types

```rust
use std::cell::Cell;

struct Counter {
    calls: Cell<u32>,
}

impl Counter {
    fn bump(&self) -> u32 {
        let next = self.calls.get() + 1;
        self.calls.set(next);
        next
    }
}
```

`Cell<T>` moves values in and out by copy, so no reference to the contents ever exists and nothing can
alias. It suits `Copy` types and `Option<T>`, and it is not `Sync`, so it cannot cross a thread boundary.

## RefCell when a reference is needed

```rust
use std::cell::RefCell;

struct Cache {
    entries: RefCell<Vec<String>>,
}

impl Cache {
    fn add(&self, entry: String) {
        self.entries.borrow_mut().push(entry);
    }

    fn len(&self) -> usize {
        self.entries.borrow().len()
    }
}
```

`borrow` hands out a shared reference and `borrow_mut` a mutable one, counted at run time. Two overlapping
`borrow_mut` calls panic, and the panic names the borrow that was already live, which makes the fix far
easier than a mystery crash. A borrow held across a recursive call or an `await` is the usual cause.

## OnceLock for a value computed once

```rust
use std::sync::OnceLock;

static CONFIG: OnceLock<String> = OnceLock::new();

fn config() -> &'static str {
    CONFIG.get_or_init(|| String::from("loaded from the environment"))
}
```

The initialiser runs on first use and the value is shared afterwards. `OnceLock` is the thread safe version
and covers most of what `lazy_static` and `once_cell` were installed for. The thread local `OnceCell` is the
single threaded equivalent.

## Mutex for state shared between threads

```rust
use std::sync::Mutex;

struct Registry {
    names: Mutex<Vec<String>>,
}

impl Registry {
    fn add(&self, name: String) {
        self.names.lock().expect("poisoned").push(name);
    }

    fn count(&self) -> usize {
        self.names.lock().expect("poisoned").len()
    }
}
```

The mutex gives interior mutability that is safe across threads, and the cost is a lock on every access.
`lock` returns a `Result` because a panic while holding the lock poisons it, which is the library reporting
that a writer may have left the data inconsistent.

## Where it does not belong

Every use removes a compile-time check, so it is worth asking whether a better data flow removes the need:
pass `&mut` where the caller can, return a new value where it can, and keep `Cell` or `RefCell` for the cases
where a trait or a callback leaves no alternative.

## Check yourself

Write a struct with a `Cell<u32>` counter and a `RefCell<Vec<String>>` log, both mutated through `&self`. Then
call `borrow_mut` twice in overlapping scopes, read the panic, and fix it by narrowing one of the borrows.
