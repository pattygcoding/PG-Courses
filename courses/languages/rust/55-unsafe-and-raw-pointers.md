---
title: Unsafe and raw pointers
summary: The five things that need it, how to wrap it in a safe API, and how Miri checks the result.
chapter: Performance and the machine
minutes: 15
status: draft
---

## What unsafe does and does not do

```rust
let value = 5;
let pointer = &value as *const i32;

let read = unsafe { *pointer };
```

An `unsafe` block says the programmer has checked the invariants the compiler cannot check. Inside it, the borrow
checker still runs, types are still checked, and a move of a borrowed value is still an error. What it adds is
permission for five specific operations.

1. Dereference a raw pointer.
2. Call an `unsafe fn` or an `extern` function.
3. Access a mutable `static`.
4. Implement an `unsafe trait`.
5. Access a field of a `union`.

## Raw pointers

```rust
let mut value = 5;
let pointer: *mut i32 = &mut value;

unsafe {
    *pointer += 1;
    println!("{}", *pointer);
}
```

`*const T` and `*mut T` are the raw forms, and they come from a reference, from `Box::into_raw`, or from an
allocation. They carry no lifetime, so nothing stops one outliving its target, and no aliasing rule, so nothing
stops two mutable pointers to the same place. That freedom is what a data structure with a hand written layout
needs and what makes the check the programmer's job.

```rust
fn sum(values: *const u32, len: usize) -> u32 {
    // SAFETY: the caller guarantees the pointer is valid for len elements
    let slice = unsafe { std::slice::from_raw_parts(values, len) };
    slice.iter().sum()
}
```

`from_raw_parts` is the bridge back to safe code: one unsafe construction and everything downstream is checked.
That shape, one unsafe block at the boundary, is what a good wrapper looks like.

## unsafe fn and the safety contract

```rust
/// # Safety
///
/// `pointer` must be non-null and valid for `len` bytes.
pub unsafe fn read_header(pointer: *const u8, len: usize) -> u8 {
    // SAFETY: the caller's contract covers this dereference
    unsafe { *pointer.add(len - 1) }
}
```

An `unsafe fn` moves the obligation to the caller, which is only reasonable when the caller has information the
function does not, such as an allocation size. In Rust 2024, the body of an `unsafe fn` is no longer implicitly
unsafe, so the inner block is required and marks what is being asserted.

Every `unsafe` block should carry a `// SAFETY:` comment saying which invariant holds and why. It is a convention
`clippy` can enforce with `undocumented_unsafe_blocks`, and it is the difference between a reviewable unsafe block
and a wish.

## A safe wrapper around an unsafe core

```rust
pub struct Ring {
    buffer: Box<[u8]>,
    head: usize,
}

impl Ring {
    pub fn new(capacity: usize) -> Self {
        Self { buffer: vec![0; capacity].into_boxed_slice(), head: 0 }
    }

    pub fn push(&mut self, byte: u8) {
        let len = self.buffer.len();
        self.buffer[self.head % len] = byte;
        self.head = self.head.wrapping_add(1);
    }

    pub fn get(&self, index: usize) -> Option<u8> {
        self.buffer.get(index % self.buffer.len()).copied()
    }
}
```

The public API is safe and the modulo handles the wrap, so there is no case a caller can get wrong. `get` returns
an `Option` rather than using `get_unchecked`, because the check costs almost nothing here and the correctness
argument is one line shorter. Reach for the unchecked version only after a benchmark says the check matters.

## MaybeUninit

```rust
use std::mem::MaybeUninit;

let mut slot: MaybeUninit<[u8; 1024]> = MaybeUninit::uninit();
```

`MaybeUninit<T>` is a value that may not be initialised, which is what a buffer being filled by a system call
needs. Reading it before writing is undefined behaviour, and the type name is the reminder. This is the part of
`unsafe` that most code never needs, and it belongs in a crate with tests that run under Miri.

## Miri checks what the compiler does not

```bash
rustup +nightly component add miri
cargo +nightly miri test
```

Miri interprets the tests and the code they reach, catching out of bounds access, use after free, unaligned
access, and data races that would be silent on the machine you are testing on. It is slow, so it runs on a small
suite, and it is the strongest tool available for checking a hand written `unsafe` block.

## The default is safe

Most Rust code has no `unsafe` at all, and the crates that need it keep it in a small module with a safe surface
and tests. When you do write it, the order of preference is: a safe formulation, a safe wrapper over a tiny unsafe
block, and only then an unsafe API that pushes the obligation to the caller.

## Check yourself

Write a safe wrapper over a small unsafe block, add a `// SAFETY:` comment explaining the invariant, and run the
tests under Miri. Then break the invariant deliberately and read what Miri reports that a normal test run does
not.
