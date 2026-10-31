---
title: Vec, arrays and slices
summary: The growable list, how capacity relates to length, and the operations worth knowing.
chapter: Collections and iterators
minutes: 14
status: draft
---

## Length and capacity are different numbers

```rust
let mut values = Vec::with_capacity(4);

values.push(1);
values.push(2);

println!("len {} capacity {}", values.len(), values.capacity());   // len 2 capacity 4
```

Capacity is how much room is allocated, and length is how much is in use. Pushing past the capacity allocates
a bigger buffer and copies the elements, so a loop that pushes a known number of items should reserve first:

```rust
let mut results = Vec::with_capacity(input.len());

for line in input.lines() {
    results.push(parse(line));
}
```

That removes every reallocation and is a one word change in the common case.

## Adding, removing and keeping

```rust
let mut values = vec![3, 1, 2];

values.push(4);              // append
values.insert(0, 9);         // at an index, shifting the rest
let last = values.pop();      // Option<T>
values.remove(0);             // panics when out of range

values.retain(|value| *value > 1);
values.extend([10, 11]);
values.sort();
values.dedup();
```

`retain` keeps the elements matching a predicate and is the readable way to filter in place. `dedup` only
removes consecutive duplicates, so sort first when you want unique values. `sort_unstable` is faster and gives
no guarantee of order among equal elements, which is fine for numbers.

## Indexing panics, get returns an Option

```rust
let values = vec![10, 20, 30];

let second = values[1];               // panics when out of range
let maybe = values.get(9);            // None
let tail = values.get(1..);           // Some(&[20, 30])
```

Reach for `get` when the index comes from input. Reaching for `[]` is fine inside a loop bounded by `len()`,
where the compiler can see the bound.

## A slice is the parameter type

```rust
fn total(values: &[i32]) -> i32 {
    values.iter().sum()
}

let owned = vec![1, 2, 3];
let array = [1, 2, 3];

total(&owned);
total(&array);
```

`&[T]` accepts a `Vec`, an array and a subslice, so it is the right parameter for a function that reads a
sequence. Take `&Vec<T>` and you exclude the other two for no gain.

## Borrowing an element mutably

```rust
for value in &mut values {
    *value *= 2;
}

let doubled: Vec<i32> = values.iter().map(|value| value * 2).collect();
```

Iterating `&mut values` gives each element as a `&mut T`, so the change is in place and nothing is copied.
Iterating `values` moves the elements out, which is what you want when the vector is not needed afterwards.

## When Vec is the wrong container

Use `VecDeque` when you push and pop at both ends, `BinaryHeap` when you repeatedly need the largest value,
and a `HashMap` when lookup by key is the main operation. A `Vec` is the default and the fastest for scanning
in order, so start there and change when a measurement says so.

## Check yourself

Build a `Vec` of ten thousand integers twice, once with `Vec::new()` and once with `with_capacity`, and print
the capacity after each. Then write a function taking `&[i32]` and call it with a `Vec`, an array and a
subslice.
