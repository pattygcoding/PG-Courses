---
title: Iterator performance
summary: Why a chain of adapters compiles to the same machine code as a loop, and where it stops doing that.
chapter: Collections and iterators
minutes: 13
status: draft
---

## Adapters do nothing until something consumes

```rust
let chain = values.iter().map(|value| value * 2).filter(|value| *value > 10);
```

That line allocates nothing and computes nothing. Each adapter wraps the previous iterator, and the work
happens when `next` is called, which only happens when a consumer such as `collect`, `sum` or a `for` loop
drives it. That is what lazy means here, and it is why two chained `filter` calls cost one pass rather than two.

## A chain compiles to a loop

```rust
let total: i64 = values
    .iter()
    .filter(|value| **value > 0)
    .map(|value| *value as i64)
    .sum();
```

The compiler inlines `next` through the whole chain, so this becomes a loop with a comparison and an addition.
There is no vtable and no intermediate `Vec`, which is the zero cost abstraction claim in practice. Writing the
equivalent `for` loop rarely produces better code, so choose the one you would rather read.

## Where the cost reappears

```rust
let boxed: Box<dyn Iterator<Item = &i32>> = Box::new(values.iter());
let total: i32 = boxed.sum();
```

A boxed iterator is a trait object, so `next` is a call through a vtable and cannot be inlined. In a loop over
a million items that is measurable. Use `impl Iterator` in a return type and keep the concrete type, and reach
for a box only where the concrete type genuinely varies at run time.

The other cost is allocation:

```rust
let doubled: Vec<i32> = values.iter().map(|v| v * 2).collect();
```

`collect` uses `size_hint` to reserve the right capacity, so this is one allocation rather than a growing
series. `filter` has a poor size hint and reserving by hand helps when the result is large:

```rust
let mut doubled = Vec::with_capacity(values.len());
doubled.extend(values.iter().map(|v| v * 2));
```

## Collecting into the right container

```rust
let set: std::collections::HashSet<i32> = values.iter().copied().collect();
let map: std::collections::HashMap<i32, &str> =
    values.iter().map(|value| (*value, "n")).collect();
let text: String = values.iter().map(|value| value.to_string()).collect();
```

`collect` is generic over anything implementing `FromIterator`, so the target type in the annotation decides
what is built. A `String` collects from characters or string slices, and a `HashMap` collects from pairs.

## Measuring instead of guessing

```rust
let mut sum = 0i64;
for value in &values {
    if *value > 0 {
        sum += *value as i64;
    }
}
```

Write both versions, put them in a `criterion` benchmark, and compare. The iterator version usually wins or
ties, since it gives the optimiser the same information with fewer index bounds to prove away. When it does
not, the measurement tells you which line to look at rather than the intuition.

## Check yourself

Write a chain of three adapters and the equivalent `for` loop, and benchmark both over a vector of a million
integers. Then repeat with the iterator boxed and record the difference.
