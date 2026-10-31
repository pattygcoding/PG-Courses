---
title: Idioms, traps and where to go next
summary: The habits that keep a codebase easy to change, the mistakes that look like good ideas, and what to read after this.
chapter: Advanced and the edges
minutes: 13
status: draft
---

## Signatures that avoid fights

Take the widest borrowed type the function can use: `&str` rather than `&String`, `&[T]` rather than `&Vec<T>`,
`impl AsRef<Path>` rather than `&PathBuf`. Return owned values from anything that builds data, so lifetimes stay
out of the middle of the program. Take references in parameters unless the function stores or consumes the value.

```rust
fn normalise(input: &str) -> String {
    input.trim().to_lowercase()
}
```

A signature like that compiles at every call site and never needs a lifetime parameter. Most borrow checker
friction comes from a signature that borrows more than the function needs.

## Errors at the right layer

A library returns a typed error and never `unwrap` on something a caller could have handled. A binary uses
`anyhow` and reports the whole chain. A panic is for a broken invariant, not for input a user typed. `expect` with
a message beats `unwrap` in a binary, because the message appears in the log.

```rust
let port: u16 = value.parse().context("port must be a number")?;
```

## The traps

`Deref` for inheritance. A newtype that derefs to its inner type exposes the whole inner API, which removes the
point of the newtype. Implement `Deref` for a wrapper that genuinely is the inner thing, as `String` is to `str`.

`Default` that violates an invariant. A `Port` with `Default` of zero, an interval with a default of zero, a name
that defaults to empty. If no valid value is available, leave `Default` unimplemented, which is information.

A `clone` that silences the compiler. It compiles and it may be correct, but a clone added without understanding
the borrow is how a hot loop becomes slow. Understand the error first, then decide.

Interior mutability as a first resort. `RefCell` inside a struct that could own its data, or take `&mut self`,
adds a run time panic for a problem that a different shape solves.

A lock held across an await. It compiles in a single threaded executor and deadlocks in a multi threaded one.
Keep the lock scope tight, and use the async aware primitive when the guard has to span an await.

An `as` cast on input from outside. It truncates silently. Use `try_into` and handle the error.

Ignoring a poisoned lock. `lock().unwrap()` on a mutex that another thread panicked inside turns one failure into
two. Decide what the data means when a writer died: recover it, or fail loudly.

Async for CPU bound work. It adds a state machine per function and buys nothing when the work never waits.
Threads or `rayon` are the answer.

`unsafe` without a documented contract. The block is where the argument belongs. `// SAFETY:` is a review tool,
and `deny(undocumented_unsafe_blocks)` is the way to require it.

## Where to read next

The standard library documentation is the reference for every method this course mentioned and is worth browsing
by type rather than searching. The Rust Book covers the language from the beginning and is a good second pass over
the topics that did not land. The Rustonomicon covers `unsafe` and data structures in detail. The Async Book
covers executors and futures, and the Embedded Rust Book covers `no_std` and the microcontroller toolchain.

Read the source of a crate you use. `cargo doc --open` has a source link on every item, and a well written small
crate is the fastest way to see how these patterns look in production code.

## Check yourself

Take the command line tool you built through this course and run the full check: `cargo fmt --check`,
`cargo clippy --all-targets --all-features -- -D warnings`, `cargo test --workspace`, and `cargo doc`. Then pick
one function that uses a `clone` and remove it without changing the behaviour.
