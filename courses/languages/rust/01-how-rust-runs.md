---
title: How Rust runs your code
summary: Ahead of time compilation, no runtime, and the two build profiles that decide how fast the result is.
chapter: Getting started
minutes: 12
status: draft
---

## There is no interpreter and no virtual machine

```bash
cargo build --release
```

`rustc` compiles your crate straight to machine code for the target you are on. The result is a native
executable that starts in microseconds, needs no runtime installed, and has no garbage collector in it.
That is the whole difference from a language that ships a virtual machine.

The one piece of support the executable does need is a C library for things like opening a file, unless
you build for a target that has none. Everything else, including the memory allocator, is compiled in.

## Two profiles, two different programs

```toml
[profile.release]
opt-level = 3
lto = "thin"
codegen-units = 1
panic = "abort"
```

`cargo build` uses the `dev` profile: no optimisation, debug assertions on, and overflow checks that panic
on arithmetic that wraps. `--release` uses the `release` profile: optimised, assertions off, overflow wraps
silently.

That last difference bites people once. `let x: u8 = 255; x + 1` panics in a debug build and gives `0` in
a release build. Keep overflow checks on in release for code that handles sizes or money, and pay the
small cost.

## Where the compiler checks things no test will

```rust
fn main() {
    let text = String::from("hello");
    let moved = text;
    println!("{text}");   // does not compile: value borrowed after move
}
```

The borrow checker runs before code generation, so this is a compile error rather than a runtime crash or
a memory leak. Almost everything this course covers exists to make those checks possible without slowing
the program down.

## What the build produced

```text
target/debug/rust-tool/          the executable
target/debug/incremental/        cached compilation work
target/release/                  the optimised build
```

`target/` is disposable and belongs in `.gitignore`. Deleting it costs a rebuild and nothing else, and
`cargo clean` does exactly that when a build goes strange.

## Check yourself

Write a program that adds one to a `u8` holding 255, build it in both profiles, and record what each one
does. Then delete `target/` and time a fresh build.
