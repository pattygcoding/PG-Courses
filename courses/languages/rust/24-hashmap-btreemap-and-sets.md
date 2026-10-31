---
title: HashMap, BTreeMap and sets
summary: Keyed lookup, the entry API, and the ordered alternative that buys you ranges.
chapter: Collections and iterators
minutes: 14
status: draft
---

## Adding and looking up

```rust
use std::collections::HashMap;

let mut counts: HashMap<String, u32> = HashMap::new();

counts.insert(String::from("ada"), 1);

match counts.get("ada") {
    Some(count) => println!("{count}"),
    None => println!("unknown"),
}
```

`get` returns an `Option<&V>`, so a missing key is a handled case rather than a panic. Keys need `Eq` and
`Hash`, which is why deriving those on a struct is often the first step towards using it as a key.

## The entry API fills the gap

```rust
for word in text.split_whitespace() {
    *counts.entry(word.to_string()).or_insert(0) += 1;
}
```

`entry` looks the key up once and hands back a handle that is either occupied or vacant. That is one hash and
one lookup instead of a `contains_key` followed by a `insert`, and it is the idiomatic counting loop.

```rust
counts.entry(word.to_string())
    .and_modify(|count| *count += 1)
    .or_insert(1);
```

`and_modify` runs only when the key is present and `or_insert` only when it is absent.

## Hashing, and why it can be slow

```rust
use std::collections::HashMap;
use std::hash::BuildHasherDefault;
use std::collections::hash_map::DefaultHasher;

let fast: HashMap<u64, u64, BuildHasherDefault<DefaultHasher>> = Default::default();
```

The default hasher is SipHash, which resists hash flooding attacks and costs more per lookup than a trivial
hasher. For a map of integers built and read inside one function, a faster hasher from the `rustc-hash` or
`ahash` crate is measurably quicker. Keep the default when the keys come from outside your program, because a
predictable hasher lets an attacker build collisions that turn lookups into a linear scan.

## Sets and their operations

```rust
use std::collections::HashSet;

let a: HashSet<&str> = ["a", "b"].into_iter().collect();
let b: HashSet<&str> = ["b", "c"].into_iter().collect();

let both: Vec<&str> = a.intersection(&b).copied().collect();
let either: Vec<&str> = a.union(&b).copied().collect();
let only_a: Vec<&str> = a.difference(&b).copied().collect();
```

Set operations return iterators, so the result is only materialised if you collect it. `insert` returns `false`
when the value was already present, which is a cheap way to detect a duplicate.

## BTreeMap keeps the keys sorted

```rust
use std::collections::BTreeMap;

let mut timeline: BTreeMap<u64, String> = BTreeMap::new();
timeline.insert(1700000000, String::from("first"));
timeline.insert(1700000050, String::from("second"));

for (timestamp, event) in timeline.range(1700000010..) {
    println!("{timestamp} {event}");
}
```

`range` is the reason to choose `BTreeMap` over `HashMap`: it walks a contiguous span of keys in order, in
logarithmic time to find the start. A report that shows anything between two dates wants this, and reaching
for a `HashMap` first means sorting a vector on every use.

| Need | Container |
| --- | --- |
| Fast lookup by key, no order | `HashMap` |
| Iterate keys in sorted order, query ranges | `BTreeMap` |
| Membership tests and set algebra | `HashSet`, `BTreeSet` |
| Repeatedly take the largest item | `BinaryHeap` |

## Check yourself

Count the words in a paragraph with the entry API, then print the five most common. Do it once with a
`HashMap` and once with a `BTreeMap` and note which one needed a sort.
