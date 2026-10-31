---
title: Iterator adapters
summary: The combinators worth knowing, and how to pick the one that says what you mean.
chapter: Collections and iterators
minutes: 14
status: draft
---

## Transforming

```rust
let sizes: Vec<usize> = words.iter().map(|word| word.len()).collect();

let long: Vec<&&str> = words.iter().filter(|word| word.len() > 3).collect();

let parsed: Vec<i32> = parts.iter().filter_map(|part| part.parse().ok()).collect();
```

`map` changes each item, `filter` keeps some, and `filter_map` does both at once: it returns an `Option` from
the closure and drops every `None`. That is the replacement for a `filter` after a `map` that produces options,
and it is the neatest way to skip lines that do not parse.

## Flattening

```rust
let all: Vec<&str> = lines.iter().flat_map(|line| line.split(',')).collect();

let nested = vec![vec![1, 2], vec![3]];
let flat: Vec<i32> = nested.into_iter().flatten().collect();
```

`flat_map` maps to an iterable and yields its items in sequence, which is how a two level parse becomes one
pass. `flatten` does the same for an iterator of iterables with no mapping step.

## Selecting and skipping

```rust
let first_three: Vec<i32> = values.iter().copied().take(3).collect();
let rest: Vec<i32> = values.iter().copied().skip(1).collect();
let evens: Vec<i32> = values.iter().copied().step_by(2).collect();
let positive: Vec<i32> = values.iter().copied().take_while(|v| *v > 0).collect();
let paired: Vec<(i32, i32)> = take().zip(skip()).collect();
let indexed: Vec<(usize, i32)> = values.iter().copied().enumerate().collect();
```

`take` and `skip` are counted, and `take_while` and `skip_while` stop at the first item that fails the
predicate. `zip` stops at the shorter side, so it cannot read past the end. `enumerate` gives an index with each
item, which is usually better than indexing by hand.

## Consuming

```rust
let total: i32 = values.iter().sum();
let found = values.iter().find(|value| **value > 10);      // Option<&i32>
let any_big = values.iter().any(|value| *value > 100);      // bool
let biggest = values.iter().max_by_key(|value| **value);
let count = values.iter().filter(|value| **value > 3).count();
```

`any` and `all` short circuit, so they are cheaper than filtering and comparing to zero. `find` also stops at
the first match, which makes it the right choice when the collection is large and the match is near the front.

## Accumulating with fold

```rust
let report = entries.iter().fold(Report::default(), |mut report, entry| {
    report.total += entry.size;
    report
});
```

`fold` threads an accumulator through every item. It is the general case, and most uses of it are clearer as
`sum`, `max_by_key` or `collect`. Reach for `fold` when the accumulator is a struct that several fields are
updated in.

## Grouping and partitioning

```rust
let (small, large): (Vec<&Entry>, Vec<&Entry>) =
    entries.iter().partition(|entry| entry.size < 1024);

let mut by_kind: std::collections::HashMap<&str, Vec<&Entry>> = std::collections::HashMap::new();
for entry in &entries {
    by_kind.entry(entry.kind.as_str()).or_default().push(entry);
}
```

`partition` splits on a predicate in one pass and needs the type annotation. Grouping has no adapter in the
standard library, because the `HashMap::entry` loop is short and does exactly what a reader expects. The
`itertools` crate adds `group_by` and `chunk_by` if you want them often.

## Check yourself

Take a list of strings, parse the ones that are numbers, double them, keep those over ten, and collect the
result. Write it as one chain, then write the same thing as a `for` loop and compare which one you would rather
read in six months.
