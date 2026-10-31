---
title: Zero cost abstractions
summary: What the compiler is willing to erase, and the small changes that let it.
chapter: Performance and the machine
minutes: 13
status: draft
---

## What zero cost means

```rust
let total: u64 = records.iter().map(|record| record.size).sum();
```

An iterator chain over a `Vec` compiles to a loop over the backing array. There is no allocation, no function
pointer and no boxed closure. The abstraction is a way of writing the loop that the compiler can see through, and
the generated code is the same as the `for` loop you would have written by hand.

That is the claim: you do not pay for what you do not use, and what you do use is compiled as if written directly.
It is not a promise that generic code is as fast as a hand tuned routine, since a generic algorithm still has the
algorithm you chose.

## Where the cost is real

```rust
let boxed: Box<dyn Fn(i32) -> i32> = Box::new(|value| value * 2);
```

A trait object cannot be inlined, so each call goes through a vtable. A `String` where a `&str` would do costs an
allocation. A `clone` in a loop costs an allocation per iteration. Those are the three costs worth looking for, and
all three are visible in the source.

```rust
fn describe(name: &str) -> String {
    format!("name: {name}")
}
```

`format!` allocates. Calling it in a hot loop to build a message that is immediately discarded is a common place
to lose time. Returning a `&'static str` or writing into a reused buffer removes it.

## Inline hints

```rust
#[inline]
pub fn small_helper(value: u64) -> u64 {
    value * 2
}

#[inline(always)]
fn hot_inner(value: u64) -> u64 {
    value & 0xff
}

#[inline(never)]
fn cold_report(error: &Error) {
    eprintln!("{error}");
}
```

The compiler already inlines what it can see and decides is worth it. `#[inline]` matters across a crate boundary,
where the body is not available without it, and it is the reason a small public function in a library often
carries it. `#[inline(always)]` overrides the heuristic and is a measurement driven decision, not a default.
`#[inline(never)]` keeps a cold path out of the way so the hot code stays inside the instruction cache.

## Bounds checks

```rust
let mut total = 0u64;

for value in &values {
    total += *value;
}
```

Iterating removes the bounds check, because the iterator knows the length and the compiler can see that the index
is always valid. The version that indexes by hand usually keeps a check per iteration:

```rust
let mut total = 0u64;

for index in 0..values.len() {
    total += values[index];
}
```

Both are safe and the difference is small. `get_unchecked` removes the check at the cost of an unsafe block and
the obligation to prove the index is in range, which is rarely worth it outside a measured inner loop.

## Allocation

```rust
let mut output = Vec::with_capacity(input.len() / 4);

for line in input.lines() {
    output.push(transform(line));
}
```

Reserving the output capacity removes every reallocation and copy, which is usually the largest single win
available in a function that builds a collection. The same applies to a `String` built with `push_str` in a loop.

## Reading the assembly

```bash
cargo install cargo-asm
cargo asm --rust mylib::parse
```

`cargo asm` prints the generated assembly for one function, and the Compiler Explorer website does the same for a
snippet. It is the way to confirm that a chain was inlined or that a bounds check disappeared, rather than
assuming. Use it on the function the profiler named and not on the whole program.

## Check yourself

Write a function that sums a slice twice, once iterating and once indexing, and compare the assembly from
`cargo asm`. Then find a `format!` in a loop, replace it with a reused buffer, and benchmark the change.
