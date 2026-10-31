---
title: no_std and embedded
summary: Rust without the standard library, the parts that survive, and the small crates that replace the rest.
chapter: Advanced and the edges
minutes: 13
status: draft
---

## Three layers, not one

| Crate | What it needs |
| --- | --- |
| `core` | nothing: no allocator, no operating system |
| `alloc` | an allocator: `Vec`, `String`, `Box` |
| `std` | an operating system: files, threads, time, a heap |

```rust
#![no_std]

use core::fmt::Write;
```

`#![no_std]` drops `std` from the prelude. `core` is still available, so integers, slices, `Option`, `Result`,
iterators, `cell`, `sync::atomic` and `fmt` all work. That is more of the language than it sounds: a parser, a
protocol implementation or a checksum usually needs nothing else.

Add `extern crate alloc;` and you also get `Vec`, `String`, `Box` and `BTreeMap`, provided something supplies an
allocator through a `GlobalAlloc` implementation.

## What is missing

`HashMap` is in `std` only, because the default hasher needs a random seed from the operating system. `thread`,
`fs`, `net`, `env` and `time` are all `std`. Anything that reads the clock, touches a file or opens a socket is
gone, and the replacement arrives as a trait from a hardware abstraction crate.

That is the useful shape for firmware: the protocol logic is `no_std` and testable on the host, and the
platform specific part is a small layer behind a trait.

## The pieces the compiler asks for

```rust
#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

#[unsafe(no_mangle)]
pub extern "C" fn _start() -> ! {
    loop {}
}
```

That is the skeleton of a freestanding binary. The panic handler is required, because without `std` there is
nothing to print to. `_start` is the entry point when no runtime provides one. On a Cortex-M target, the
`cortex-m-rt` crate supplies both and the application writes an attribute instead.

An allocator is the fourth piece when `alloc` is in use:

```rust
use core::alloc::GlobalAlloc;

struct Bump { /* ... */ }

unsafe impl GlobalAlloc for Bump {
    unsafe fn alloc(&self, layout: core::alloc::Layout) -> *mut u8 {
        // allocate `layout.size()` bytes aligned as requested
        core::ptr::null_mut()
    }

    unsafe fn dealloc(&self, _ptr: *mut u8, _layout: core::alloc::Layout) {}
}

#[global_allocator]
static ALLOCATOR: Bump = Bump { };
```

A bump allocator hands out memory and frees nothing until reset, which is often enough for firmware that
allocates during setup and then stops.

## Crates that make it workable

```toml
[dependencies]
heapless = "0.8"
embedded-hal = "1"
cortex-m = "0.7"
cortex-m-rt = "0.7"
defmt = "0.3"
```

`heapless` gives a `Vec`, a `String` and a queue with a fixed capacity and no allocator, which is what a device
with 20 KB of RAM needs. `embedded-hal` defines traits for a pin, a bus and a delay, so a driver written against
those traits runs on any microcontroller implementing them. `defmt` logs through a debug probe with far less code
size than `core::fmt`, which matters when the flash is small.

## Why a normal program might be no_std anyway

A Linux binary that uses `no_std` plus `alloc` starts faster, is smaller, and does not link the operating system's
C library. The cost is that every platform service has to be reached through a system call, which the `libc` crate
or a wrapper exposes. This is worth it for a small tool and rarely worth it for an application.

## Check yourself

Write a library crate with `#![no_std]` that parses a small binary format using only `core`, with tests that run
on the host. Then add `extern crate alloc` and return a `Vec`, confirming it still compiles without `std`.
