---
title: Modules, crates and the standard library
summary: How code is grouped, what a path means, and where to look in the docs.
chapter: Getting started
minutes: 12
status: draft
---

## A module is a namespace

```rust
mod parser {
    pub fn parse(input: &str) -> Vec<&str> {
        input.split(',').collect()
    }

    fn helper() -> usize {
        0
    }
}

fn main() {
    println!("{:?}", parser::parse("a,b"));
}
```

`mod` groups items and controls visibility. `pub` makes an item reachable from outside; without it the item
is private to the module and its descendants. That default is the reason a Rust API surfaces less than you
expect, and it is easy to widen later.

## Files or inline, same thing

```rust
mod parser;         // loads src/parser.rs
mod parser { }      // inline
```

```text
src/
  main.rs
  parser.rs
  parser/
    detail.rs       // a submodule of parser
```

Cargo looks for a file named after the module, or a directory with a `mod.rs` in it for older layouts. The
module tree is what decides where a file lives rather than the other way round, which is why moving code
between files rarely changes the public path.

## Paths, and self, super and crate

```rust
use std::collections::HashMap;
use crate::parser::parse;
use super::helper;
use self::detail::Thing;
```

`crate::` starts at the root of the current crate. `super::` goes up one module and `self::` refers to the
current one. `std::` is the standard library, `core::` is the part that works without an operating system,
and `alloc::` is the part that needs an allocator.

## The standard library, in four parts

| Namespace | What is in it |
| --- | --- |
| `std::collections` | `Vec`, `HashMap`, `BTreeMap`, `VecDeque`, `BinaryHeap` |
| `std::io` | readers, writers, files, standard streams |
| `std::sync` | `Arc`, `Mutex`, `mpsc`, atomics |
| `std::fmt` | `Display`, `Debug`, formatting traits |

Everything else is either a small module for a specific job, such as `std::path` or `std::time`, or a crate
on crates.io.

## Check yourself

Create a module in a separate file, make one function public and another private, and call the private one
from inside the module. Then try to call it from `main` and read the compiler's suggestion.
