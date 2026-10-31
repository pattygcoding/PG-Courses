---
title: Memory layout and the cache
summary: What size_of tells you, where padding comes from, and why a Vec of structs beats a linked list.
chapter: Performance and the machine
minutes: 14
status: draft
---

## size_of and align_of

```rust
use std::mem::{align_of, size_of};

println!("{} {}", size_of::<u8>(), align_of::<u8>());       // 1 1
println!("{} {}", size_of::<u64>(), align_of::<u64>());     // 8 8
println!("{} {}", size_of::<(u8, u64)>(), align_of::<(u8, u64)>());   // 16 8
```

The tuple holds one byte and eight, and it is sixteen bytes because the `u64` has to start at an address
divisible by eight. The seven bytes in between are padding, and they cost memory bandwidth on every pass over a
collection.

```rust
struct Small {
    a: u8,
    b: u64,
    c: u8,
}

println!("{}", size_of::<Small>());   // 24
```

Three useful bytes and twenty four total. This is why the field order in a struct matters in a program that
stores millions of them.

## repr decides the layout

```rust
#[repr(C)]
struct Header {
    version: u8,
    length: u64,
}

#[repr(packed)]
struct Tight {
    version: u8,
    length: u64,
}
```

`repr(Rust)` is the default: the compiler may reorder fields to reduce padding, and it makes no promise about
the result across compilations. `repr(C)` uses the C rules, which is required for a struct crossing an FFI
boundary and is also what you want when a specific layout is part of the design. `repr(packed)` removes the
padding entirely and is almost always a mistake, because taking a reference to a field can then be unaligned,
which is undefined behaviour on most architectures.

With `repr(C)`, ordering the fields largest first removes the padding:

```rust
#[repr(C)]
struct Good {
    length: u64,
    version: u8,
}

println!("{}", size_of::<Good>());   // 16
```

## Enums carry a discriminant

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Blob([u8; 32]),
}

println!("{}", size_of::<Message>());   // 40: 32 for the blob, 8 for the tag and alignment
```

An enum is as large as its biggest variant plus a tag, unless the tag can be packed into an unused bit pattern.
`Option<Box<T>>`, `Option<&T>` and `Option<NonNull<T>>` get the niche optimisation and stay pointer sized, which
is why an optional reference is free.

## Cache lines are the real currency

```rust
let records: Vec<Record> = load_all();      // contiguous, one cache miss per 64 bytes

let list: LinkedList<Record> = build_list(); // one pointer chase per element
```

A cache line is typically 64 bytes. Walking a contiguous `Vec` pulls in eight 8 byte fields per miss, and the
hardware prefetcher predicts the pattern. A linked list touches a new cache line for every step, so it is often
several times slower to traverse even though the algorithmic complexity is the same. That is the reason `Vec` is
the default container in Rust and a linked list almost never is.

The same effect decides between an array of structs and a struct of arrays:

```rust
struct Wide {
    id: u64,
    name: String,
    size: u64,
    checksum: u64,
}

let sizes: Vec<u64> = records.iter().map(|record| record.size).sum();
```

Summing `size` walks every field of every record, pulling in names and checksums that the loop does not read. A
separate `Vec<u64>` of sizes would make that loop several times faster, at the cost of keeping two structures
consistent. That trade is worth making for a hot loop and not worth making for anything else.

## False sharing

Two threads writing to different `AtomicU64` values that sit in the same cache line force that line to bounce
between cores, and both slow down despite touching different data. Padding a shared counter out to a cache line
with `#[repr(align(64))]` fixes it, and it is a case where adding unused bytes makes the program faster.

```rust
#[repr(align(64))]
struct Padded(AtomicU64);
```

## Check yourself

Print `size_of` for a struct with a `u8`, a `u64` and another `u8`, once in the written order and once with the
`u64` first and `repr(C)` on both. Then build a `Vec` of a million small structs and a `LinkedList` of the same,
and time summing one field from each.
